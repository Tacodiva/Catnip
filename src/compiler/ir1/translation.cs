// Translation of GHC.Wasm.ControlFlow.FromCmm (Haskell) into C#-style pseudocode.
// Goal: make the algorithm readable to someone familiar with C-like languages.
// NOTE: This is illustrative code; it is not intended to compile as-is.
//
// Summary
// -------
// This module turns a reducible Cmm control-flow graph (CFG) into structured
// WebAssembly control flow (blocks, loops, if-then-else, br/br_table).
// It follows the approach described in the “Relooper” paper:
//   https://www.cs.tufts.edu/~nr/pubs/relooper.pdf
//
// High-level idea
// ---------------
// - Walk the dominator tree of the CFG.
// - For each block, emit straight-line actions, then translate its outgoing control flow:
//     * Unconditional branch -> either a br to an enclosing structure, or inline the target subtree.
//     * Conditional branch   -> emit WasmIf with translations of true and false targets.
//     * Switch               -> emit WasmBrTable with computed table + default.
//     * Tail call            -> emit WasmTailCall.
// - Use an evaluation context (stack of enclosing syntactic frames) to compute the
//   relative depth for br instructions and to recognize “fallthrough” opportunities.
// - Recognize loops (headers) and merge points (where multiple forward edges merge).
//   Emit WasmLoop around loop headers and WasmBlock around merge points as needed.
//
// Major data structures
// ---------------------
// - ControlFlow: the possible ways a block can exit.
// - Context: the stack of enclosing frames (block/loop/if) and a fallthrough label.
// - Enclosing frames (ContainingSyntax): BlockFollowedBy(label), LoopHeadedBy(label),
//   IfThenElse(optional follow label).
// - WasmControl: structured control nodes (Block, Loop, If, BrTable, Br, Fallthrough, TailCall, Actions).
//
// Types with minimal stubs are included here only to make the algorithm readable.
//

using System;
using System.Collections.Generic;
using System.Linq;

public class FromCmm
{
    // ------------- External-ish placeholders to make the pseudocode readable -------------

    // A label identifies a basic block.
    public struct Label
    {
        public int Id;
        public override string ToString() => $"L{Id}";
    }

    // Placeholder for Cmm expressions and statements/actions.
    public class CmmExpr { /* ... */ }
    public class CmmActions { /* straight-line code (middle of the block) ... */ }

    // A basic block: entry label, body (actions), and a “last node” that determines control flow.
    public class CmmBlock
    {
        public Label Entry;
        public CmmActions Body;
        public CmmLastNode Last;

        // Successor labels in the CFG (edges out of this block).
        public List<Label> Successors = new List<Label>();
    }

    // Graph of blocks with entry label.
    public class CmmGraph
    {
        public Label Entry;
        public Dictionary<Label, CmmBlock> Blocks = new Dictionary<Label, CmmBlock>();
    }

    // Last-node forms capturing the control transfer of a block.
    public abstract class CmmLastNode { }
    public class CmmBranch : CmmLastNode { public Label Target; }
    public class CmmCondBranch : CmmLastNode { public CmmExpr Cond; public Label TrueTarget; public Label FalseTarget; }
    public class CmmSwitch : CmmLastNode
    {
        public CmmExpr Scrutinee;
        // Simplified: indexed cases from 0..N-1 (Maybe Label in Haskell -> null for “no target”)
        public List<Label?> Targets = new List<Label?>();
        public Label? DefaultTarget;
        public BrTableInterval Range; // inclusive [Lo, Hi]
        public int Offset;            // offset added to scrutinee before range/testing
    }
    public class CmmCall : CmmLastNode { public CmmExpr Target; }

    // BrTable interval [lo..hi].
    public struct BrTableInterval { public long Lo; public long Hi; }

    // Simplified platform; just enough for width-based helpers.
    public class Platform
    {
        public int WordWidthBits = 32;
        // Determine expression width in bits (placeholder).
        public int ExprWidthBits(CmmExpr e) => 32;
    }

    // WebAssembly type info (stack effect): here we only need to know if “post” is empty.
    public class WasmFunctionType
    {
        public List<string> PostTypes; // e.g., ["i32"] or []
        public bool PostIsEmpty => PostTypes == null || PostTypes.Count == 0;

        public static WasmFunctionType ReturnsI32() => new WasmFunctionType { PostTypes = new List<string> { "i32" } };
        public static WasmFunctionType ReturnsNothing() => new WasmFunctionType { PostTypes = new List<string>() };
    }

    // Structured WebAssembly control tree.
    public abstract class WasmControl
    {
        // Monoidal composition: sequentially concatenate two control fragments.
        public static WasmControl Concat(WasmControl a, WasmControl b)
        {
            if (a is WasmSeq sa) { var list = new List<WasmControl>(sa.Items); list.Add(b); return new WasmSeq(list); }
            return new WasmSeq(new List<WasmControl> { a, b });
        }
    }

    public class WasmSeq : WasmControl
    {
        public List<WasmControl> Items;
        public WasmSeq(List<WasmControl> items) { Items = items; }
    }
    public class WasmBlock : WasmControl
    {
        public WasmFunctionType Type;
        public WasmControl Body;
        public WasmBlock(WasmFunctionType t, WasmControl b) { Type = t; Body = b; }
    }
    public class WasmLoop : WasmControl
    {
        public WasmFunctionType Type;
        public WasmControl Body;
        public WasmLoop(WasmFunctionType t, WasmControl b) { Type = t; Body = b; }
    }
    public class WasmIf : WasmControl
    {
        public WasmFunctionType Type;
        public object CondExpr; // result of txExpr
        public WasmControl Then;
        public WasmControl Else;
        public WasmIf(WasmFunctionType t, object cond, WasmControl th, WasmControl el) { Type = t; CondExpr = cond; Then = th; Else = el; }
    }
    public class WasmTailCall : WasmControl
    {
        public object TargetExpr;
        public WasmTailCall(object e) { TargetExpr = e; }
    }
    public class WasmBrTable : WasmControl
    {
        public object ScrutineeExpr;
        public BrTableInterval Range;
        public List<int> Targets; // depth indices
        public int DefaultTarget; // depth index
        public WasmBrTable(object e, BrTableInterval range, List<int> targets, int def) { ScrutineeExpr = e; Range = range; Targets = targets; DefaultTarget = def; }
    }
    public class WasmBr : WasmControl
    {
        public int Depth;
        public WasmBr(int d) { Depth = d; }
    }
    public class WasmFallthrough : WasmControl { }
    public class WasmActions : WasmControl
    {
        public object Stmt; // result of txBlock
        public WasmActions(object stmt) { Stmt = stmt; }
    }

    // ---------------------- Core translation data types ----------------------

    // Ways a block can exit.
    private abstract class ControlFlow
    {
        public class Unconditional : ControlFlow { public Label Target; public Unconditional(Label l) { Target = l; } }
        public class Conditional : ControlFlow
        {
            public CmmExpr Cond;
            public Label TrueTarget, FalseTarget;
            public Conditional(CmmExpr c, Label t, Label f) { Cond = c; TrueTarget = t; FalseTarget = f; }
        }
        public class Switch : ControlFlow
        {
            public CmmExpr Scrutinee;      // after smartExtend/smartPlus
            public BrTableInterval Range;  // inclusive range of values
            public List<Label?> Targets;   // table index -> maybe label
            public Label? DefaultTarget;
            public Switch(CmmExpr e, BrTableInterval r, List<Label?> t, Label? d) { Scrutinee = e; Range = r; Targets = t; DefaultTarget = d; }
        }
        public class TailCall : ControlFlow { public CmmExpr Target; public TailCall(CmmExpr e) { Target = e; } }
    }

    // Enclosing frames (evaluation context) to compute break depths and fallthrough behavior.
    private abstract class ContainingSyntax
    {
        public class BlockFollowedBy : ContainingSyntax { public Label Follow; public BlockFollowedBy(Label l) { Follow = l; } }
        public class LoopHeadedBy : ContainingSyntax { public Label Header; public LoopHeadedBy(Label l) { Header = l; } }
        public class IfThenElse : ContainingSyntax { public Label? Follow; public IfThenElse(Label? l) { Follow = l; } }
    }

    private class Context
    {
        public List<ContainingSyntax> Enclosing = new List<ContainingSyntax>();
        public Label? Fallthrough = null; // If set, this label can be reached by falling through the "hole"

        public Context Inside(ContainingSyntax frame)
        {
            var copy = Clone();
            copy.Enclosing.Insert(0, frame); // push at front (top of stack)
            return copy;
        }
        public Context WithFallthrough(Label l)
        {
            var copy = Clone();
            copy.Fallthrough = l;
            return copy;
        }
        public Context Clone()
        {
            return new Context
            {
                Enclosing = new List<ContainingSyntax>(Enclosing),
                Fallthrough = Fallthrough
            };
        }
    }

    // ----------------------------- Public entry -----------------------------

    // Converts a reducible Cmm graph to structured Wasm control.
    // txExpr: (label, CmmExpr) -> target-language expr
    // txBlock: (label, CmmActions) -> target-language statement(s)
    public WasmControl StructuredControl(
        Platform platform,
        Func<Label, CmmExpr, object> txExpr,
        Func<Label, CmmActions, object> txBlock,
        CmmGraph g)
    {
        // Compute reducible graph with dominator info and reverse-postorder numbers.
        var gwd = GraphWithDominators.AsReducible(GraphWithDominators.Build(g));

        // Dominator tree with children sorted by highest reverse-postorder first
        var domTree = SortTreeByRPDescending(gwd.DominatorTree, gwd);

        // The algorithm works with function type annotations; two cases matter:
        var returnsI32 = WasmFunctionType.ReturnsI32();
        var returnsNothing = WasmFunctionType.ReturnsNothing();

        // Recursive translation functions
        WasmControl DoTree(WasmFunctionType fty, DomTreeNode node, Context ctx)
        {
            var block = node.Block;

            // Children used for nesting.
            var selectedChildren = SelectChildrenForBlock(block, node.Children);

            if (IsLoopHeader(block, gwd))
            {
                // Wrap the node in a loop if it's a loop header.
                var loopCtx = ctx.Inside(new ContainingSyntax.LoopHeadedBy(block.Entry));
                var body = NodeWithin(fty, block, selectedChildren, followMark: null, loopCtx);
                return new WasmLoop(fty, body);
            }
            else
            {
                return NodeWithin(fty, block, selectedChildren, followMark: null, ctx);
            }
        }

        WasmControl NodeWithin(
            WasmFunctionType fty,
            CmmBlock x,
            List<DomTreeNode> children,
            Label? followMark,
            Context ctx)
        {
            // If we have a pending “follow” mark (a label after a block), insert a Block frame
            // and proceed with the rest.
            if (children.Count > 0 && followMark.HasValue)
            {
                var blockCtx = ctx.Inside(new ContainingSyntax.BlockFollowedBy(followMark.Value));
                var body = NodeWithin(fty, x, children, followMark: null, blockCtx);
                return new WasmBlock(fty, body);
            }

            // If there are still children to translate, inline the child subtree first
            // and also ensure we establish a fallthrough into that child if needed.
            if (children.Count > 0 && !followMark.HasValue)
            {
                var y = children[0];
                var rest = children.Skip(1).ToList();

                var yLabel = y.Block.Entry;

                // First: emit “nodeWithin doesn'tReturn x rest (Just yLabel)”
                var left = NodeWithin(
                    WasmFunctionType.ReturnsNothing(), // doesn'tReturn in Haskell
                    x,
                    rest,
                    followMark: yLabel,
                    ctx.WithFallthrough(yLabel)
                );

                // Then: emit the child subtree right after
                var right = DoTree(fty, y, ctx);

                return WasmControl.Concat(left, right);
            }

            // If no children remain but we still carry a followMark, wrap this in a block.
            if (children.Count == 0 && followMark.HasValue && !GeneratesIf(platform, x))
            {
                var blockCtx = ctx.Inside(new ContainingSyntax.BlockFollowedBy(followMark.Value));
                var body = NodeWithin(fty, x, children, followMark: null, blockCtx);
                return new WasmBlock(fty, body);
            }

            // Base case: translate the block itself (actions + control-flow)
            return TranslateBlockItself(fty, x, ctx, followMark);

            // Local helpers
            WasmControl TranslateBlockItself(WasmFunctionType ftype, CmmBlock blk, Context context, Label? maybeMark)
            {
                var label = blk.Entry;

                // Straight-line code first
                var actions = new WasmActions(txBlock(label, blk.Body));

                // Then control transfer
                var cf = FlowLeaving(platform, blk);

                WasmControl tail;

                switch (cf)
                {
                    case ControlFlow.Unconditional u:
                        tail = DoBranch(ftype, from: label, to: u.Target, context);
                        break;

                    case ControlFlow.Conditional c:
                        var cond = txExpr(label, c.Cond);
                        var thenPart = DoBranch(ftype, label, c.TrueTarget, context.Inside(new ContainingSyntax.IfThenElse(maybeMark)));
                        var elsePart = DoBranch(ftype, label, c.FalseTarget, context.Inside(new ContainingSyntax.IfThenElse(maybeMark)));
                        tail = new WasmIf(ftype, cond, thenPart, elsePart);
                        break;

                    case ControlFlow.TailCall tc:
                        tail = new WasmTailCall(txExpr(label, tc.Target));
                        break;

                    case ControlFlow.Switch sw:
                        // Map target labels to depth indices against the current context.
                        Func<Label?, int> idx = l => l.HasValue ? Index(l.Value, context.Enclosing) : 0; // default 0 arbitrary (as in Haskell)
                        var table = sw.Targets.Select(idx).ToList();
                        var def = idx(sw.DefaultTarget);
                        tail = new WasmBrTable(txExpr(label, sw.Scrutinee), sw.Range, table, def);
                        break;

                    default:
                        throw new InvalidOperationException("unreachable");
                }

                return WasmControl.Concat(actions, tail);
            }
        }

        WasmControl DoBranch(WasmFunctionType fty, Label from, Label to, Context ctx)
        {
            // Optimization: If we can fall through and nothing is expected on the stack, emit nothing
            if (ctx.Fallthrough.HasValue && ctx.Fallthrough.Value.Id == to.Id && fty.PostIsEmpty)
            {
                return new WasmFallthrough();
            }

            // Back edge (loop continue)
            if (IsBackward(from, to, gwd))
            {
                return new WasmBr(Index(to, ctx.Enclosing));
            }

            // Forward edge to a merge node: this is an exit; use br to the enclosing block
            if (IsMergeLabel(to, gwd))
            {
                return new WasmBr(Index(to, ctx.Enclosing));
            }

            // Else: inline the target subtree at this point
            var subtree = SubtreeAt(to, gwd);
            return DoTree(fty, subtree, ctx);
        }

        // Kick it off: the top-level expects an i32 result (per original code).
        var initialContext = new Context();
        return DoTree(WasmFunctionType.ReturnsI32(), RootOf(domTree), initialContext);
    }

    // ----------------------- Core helpers: flow analysis -----------------------

    private ControlFlow FlowLeaving(Platform platform, CmmBlock b)
    {
        if (b.Last is CmmBranch br)
        {
            return new ControlFlow.Unconditional(br.Target);
        }
        else if (b.Last is CmmCondBranch cbr)
        {
            return new ControlFlow.Conditional(cbr.Cond, cbr.TrueTarget, cbr.FalseTarget);
        }
        else if (b.Last is CmmSwitch sw)
        {
            // Haskell code adjusts scrutinee with an offset and extends to word width.
            var scrut = SmartExtend(platform, SmartPlus(platform, sw.Scrutinee, sw.Offset));
            return new ControlFlow.Switch(scrut, sw.Range, sw.Targets, sw.DefaultTarget);
        }
        else if (b.Last is CmmCall call)
        {
            return new ControlFlow.TailCall(call.Target);
        }
        else
        {
            throw new Exception("flowLeaving: unreachable");
        }
    }

    private bool GeneratesIf(Platform p, CmmBlock x) => x.Last is CmmCondBranch;

    // ------------------- Context/frame utilities (for br depth) -------------------

    private int Index(Label label, List<ContainingSyntax> frames)
    {
        // 0 = break to immediately innermost matching frame,
        // 1 = one level out, etc.
        for (int i = 0; i < frames.Count; i++)
        {
            var f = frames[i];
            if (MatchesFrame(label, f)) return i;
        }
        throw new Exception("destination label not in evaluation context");
    }

    private bool MatchesFrame(Label label, ContainingSyntax f)
    {
        switch (f)
        {
            case ContainingSyntax.BlockFollowedBy b: return b.Follow.Id == label.Id;
            case ContainingSyntax.LoopHeadedBy l:    return l.Header.Id == label.Id;
            case ContainingSyntax.IfThenElse ite:    return ite.Follow.HasValue && ite.Follow.Value.Id == label.Id;
            default: return false;
        }
    }

    // ------------------- DOM tree helpers and flow structure -------------------

    private class DomTreeNode
    {
        public CmmBlock Block;
        public List<DomTreeNode> Children = new List<DomTreeNode>();
    }

    private DomTreeNode SortTreeByRPDescending(DomTreeNode root, GraphWithDominators gwd)
    {
        var node = new DomTreeNode { Block = root.Block };
        node.Children = root.Children
            .Select(ch => SortTreeByRPDescending(ch, gwd))
            .OrderByDescending(ch => gwd.RPNumber(ch.Block.Entry))
            .ToList();
        return node;
    }

    private DomTreeNode RootOf(DomTreeNode t) => t;

    private List<DomTreeNode> SelectChildrenForBlock(CmmBlock x, List<DomTreeNode> children)
    {
        // Switch translation uses only labels; do not filter in that case.
        if (x.Last is CmmSwitch)
            return children;

        // Otherwise keep only children whose root is a merge node.
        return children.Where(ch => IsMergeNode(ch.Block, null)).ToList();

        bool IsMergeNode(CmmBlock b, object _ignored) => IsMergeLabel(b.Entry, /* need gwd to answer precisely */ _gwdForMergeCheck);
    }

    // This is a bit awkward in pseudocode: we need 'gwd' with merge info.
    // We'll thread it via a field that SelectChildrenForBlock can read.
    private GraphWithDominators _gwdForMergeCheck;

    // Called from StructuredControl before SelectChildrenForBlock is used.
    private List<DomTreeNode> SelectChildrenForBlock(CmmBlock x, List<DomTreeNode> children, GraphWithDominators gwd)
    {
        _gwdForMergeCheck = gwd;
        return SelectChildrenForBlock(x, children);
    }

    private DomTreeNode SubtreeAt(Label label, GraphWithDominators gwd)
    {
        if (gwd.Subtrees.TryGetValue(label.Id, out var node)) return node;
        throw new Exception("label not found in dominator subtrees");
    }

    private bool IsBackward(Label from, Label to, GraphWithDominators gwd)
    {
        // A self-edge or any edge to lower/equal reverse-postorder is a backward edge.
        return gwd.RPNumber(to) <= gwd.RPNumber(from);
    }

    private bool IsMergeLabel(Label l, GraphWithDominators gwd) => gwd.MergeLabels.Contains(l.Id);

    private bool IsLoopHeader(CmmBlock b, GraphWithDominators gwd) => gwd.LoopHeaders.Contains(b.Entry.Id);

    // -------------------------- Simple expression helpers --------------------------

    // Widen scrutinee to word size if needed (for br_table operand).
    private CmmExpr SmartExtend(Platform p, CmmExpr e)
    {
        var w0 = p.ExprWidthBits(e);
        var w1 = p.WordWidthBits;
        if (w0 == w1) return e;
        // Return new CmmExpr representing zero-extend from w0 to w1
        return new CmmExpr(); // placeholder
    }

    // Add small int constant to expression width-safely.
    private CmmExpr SmartPlus(Platform p, CmmExpr e, int k)
    {
        if (k == 0) return e;
        // Return new CmmExpr representing (e + k) in the width of e
        return new CmmExpr(); // placeholder
    }

    // ----------------------- Graph + dominator analysis stubs -----------------------

    // In the original Haskell, this comes from GHC's dataflow/graph libraries.
    public class GraphWithDominators
    {
        public CmmGraph Graph;
        public DomTreeNode DominatorTree;
        public Dictionary<int, DomTreeNode> Subtrees = new Dictionary<int, DomTreeNode>();
        public HashSet<int> MergeLabels = new HashSet<int>();
        public HashSet<int> LoopHeaders = new HashSet<int>();

        // Reverse postorder numbering of labels (smaller is earlier; here we just model a total order).
        private Dictionary<int, int> _rpnum = new Dictionary<int, int>();
        public int RPNumber(Label l) => _rpnum[l.Id];

        // For demo: Dominators sets would exist; we only need a predicate in Haskell.
        // We'll assume we computed MergeLabels and LoopHeaders.

        public static GraphWithDominators Build(CmmGraph g)
        {
            // Placeholder: compute dominator tree, rp numbers, predecessors,
            // merge labels (forward-only multi-predecessor), and loop headers.
            // The important part for understanding is WHAT is computed:
            //
            // - DominatorTree: tree where children are nodes immediately dominated by the parent.
            // - RP numbers: reverse postorder indices from a DFS on the graph.
            // - MergeLabels: blocks with at least two forward-only predecessors.
            // - LoopHeaders: labels that dominate one of their predecessors (backedges point to headers).
            //
            // In real code, all these are computed from 'g'.
            var gwd = new GraphWithDominators { Graph = g };

            // ... compute _rpnum, DominatorTree, Subtrees, MergeLabels, LoopHeaders ...
            // For readability we omit the implementation.

            return gwd;
        }

        public static GraphWithDominators AsReducible(GraphWithDominators gwd)
        {
            // Validate reducibility, possibly restructure; in the original this can throw if not reducible.
            return gwd;
        }
    }
}
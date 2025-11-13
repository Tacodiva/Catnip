
/**
 * The plan:
 * - For each basic block, we figure out what variables it uses.
 * - For each script, we figure out what variables it or anything it calls writes to.
 * - Figure out all the basic blocks who are yielded to (this will require figuring out which scripts are yielding)
 * 
 * - Each node has a list of variables are localized within it
 * 
 * - function localizeVariableInNode(node, variable):
 *      - If the variable is in the node's list of localized variables, return
 *          - Otherwise add it to the list
 *      - If this node not yielded to, and any of our in-links has already localized this variable, 
 *        we pass the localization along to the in-links
 *          - To do that, we localizeVariableInNode every in-node
 *      - For every node directly dominated by this node:
 *          - We check to see if the node uses this variable and has not localized it
 *              - If it does, we localizeVariableInNode the node and all of its in-nodes till we reach this node 
 * 
 * - For each node:
 *      - localizeVariableInNode every variable it accesses
 * 
 * - Until we stop making changes, repeat:
 *      - We check each node to see if every non-yield out-node has any variables localized that the node doesn't
 *          - If we find any, we localizeVariableInNode the missing variable in the parent node.
 * 
 * - All of our nodes now have a list of variables they localize
 * 
 * - For each node:
 *      - If we are yielded to, we set the transients for each variable we localize
 *      - Otherwise, either all of our in-links or none of them should should also localize this variable
 *          - If all of them do, we don't need to do do anything
 *          - If none of them do, we set the transients for each variable we localize
 *      - We replace all the operations in this node with the appropriate transient
 *      - We take a look at the flow of this node:
 *          - If it is a yield, we write all the variables this node localizes
 *          - If it is a procedure call:
 *              - If it is non-yielding:
 *                  - Write all the variables this node localizes and the called procedure reads
 *                  - Write all the variables this node localizes and the return node does not localize
 *                  - Insert instructions on the edge between the return node and this node:
 *                      - Read all the variables the called procedure writes and the return node localizes
 *          - If it is a return, write all the variables this node localizes
 *          - Otherwise [next or if], we see if any of the out-nodes have not localized any of the variables
 *               we have, if so we insert instructions on egde between the nodes:
 *              - Write all the variables missing in the out-node
 */
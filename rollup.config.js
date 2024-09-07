import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import livereload from 'rollup-plugin-livereload';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const production = !process.env.ROLLUP_WATCH;

export default [
    {
        input: 'playground/index.ts',

        output: {
            sourcemap: !production,
            format: 'iife',
            file: 'public/bundle.js',

            globals: {
                jszip: "JSZip"
            }
        },

        external: [
            'jszip'
        ],

        plugins: [
            typescript(
                {
                    tsconfig: "tsconfig.json",
                    sourceMap: !production,
                    inlineSources: !production,
                    // paths: {
                    //     "scuff": [
                    //         "../public/bundle/core/scuff.d.ts"
                    //     ],
                    //     "scuff-scratch": [
                    //         "../public/bundle/scratch/scuff-scratch.d.ts"
                    //     ]
                    // }
                }
            ),

            nodeResolve(),
            commonjs(),

            !production && livereload({ watch: ['public'] }),
            production && terser({ mangle: false }),
        ]
    }
];
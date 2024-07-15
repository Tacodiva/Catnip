const typescript = require('@rollup/plugin-typescript');
const terser = require('@rollup/plugin-terser');
const livereload = require('rollup-plugin-livereload');
const nodeResolve = require('@rollup/plugin-node-resolve');

const production = !process.env.ROLLUP_WATCH;

module.exports = [
    {
        input: 'src/index.ts',

        output: {
            sourcemap: !production,
            format: 'es',
            file: 'public/bundle.js'
        },

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

            !production && livereload({ watch: ['public'] }),
            production && terser({ mangle: false }),
        ]
    }
];
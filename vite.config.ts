import { defineConfig } from 'vite'
import { normalizePath } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

export default defineConfig({
	// ...some configs
	base: './',
	server: {
		port: 8080,
	},
	plugins: [
		viteStaticCopy({
			targets: [
				{
					src: normalizePath(path.resolve(__dirname, './models/**/*')),
					dest: normalizePath(path.resolve(__dirname, './dist/models')),
				},
			],
		}),
	],
})

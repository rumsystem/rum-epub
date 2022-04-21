import { promises as fs } from 'fs';
import { Plugin, transformWithEsbuild } from 'vite';

export const svgrPlugin = (): Plugin => ({
  name: 'vite-svgr-plugin',
  enforce: 'pre',
  load: async (id) => {
    const match = /^(.+\.svg)\?(fill|react)$/.exec(id);
    if (match) {
      const { transform } = await import('@svgr/core');
      const filePath = match[1];
      const query = match[2];
      const svgContent = (await fs.readFile(filePath, 'utf8')).toString();
      const jsCode = await transform(
        svgContent,
        {
          svgProps: {
            ...query === 'fill'
              ? { fill: 'currentColor' }
              : {},
          },
        },
        {
          componentName: 'ReactComponent',
          filePath,
        },
      );
      const res = await transformWithEsbuild(
        jsCode,
        id,
        { loader: 'jsx' },
      );
      return {
        code: res.code,
        map: null,
      };
    }
  },
});

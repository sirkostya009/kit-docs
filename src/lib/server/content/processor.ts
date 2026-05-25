import rehypeShiki from '@shikijs/rehype';
import {
	transformerMetaHighlight,
	transformerNotationDiff,
	transformerNotationHighlight,
} from '@shikijs/transformers';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import rehypeMath from './rehype/math';
import rehypeMermaid from './rehype/mermaid';
import rehypeWrapSections from './rehype/wrap-sections';
import remarkAdmonitions from './remark/admonitions';
import remarkEquation from './remark/equation';
import remarkRoute from './remark/route';
import remarkTabs from './remark/tabs';
import { transformerLang, transformerLineNumbers, transformerTitle } from './shiki';

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkMath)
	.use(remarkDirective)
	.use(remarkTabs)
	.use(remarkAdmonitions)
	.use(remarkRoute)
	.use(remarkEquation)
	.use(remarkRehype)
	.use(rehypeSlug)
	.use(rehypeAutolinkHeadings, {
		behavior: 'append',
		content: { type: 'text', value: '#' },
	})
	.use(rehypeWrapSections)
	.use(rehypeMath)
	.use(rehypeMermaid)
	.use(rehypeShiki, {
		themes: { light: 'github-light', dark: 'github-dark' },
		defaultColor: false,
		defaultLanguage: 'text',
		fallbackLanguage: 'text',
		inline: 'tailing-curly-colon',
		transformers: [
			transformerNotationHighlight(),
			transformerNotationDiff(),
			transformerMetaHighlight(),
			transformerTitle(),
			transformerLang(),
			transformerLineNumbers(),
		],
	})
	.use(rehypeStringify, { allowDangerousHtml: true });

export default processor;

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
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import rehypeWrapSections from './rehype/wrap-sections';
import remarkAdmonitions from './remark/admonitions';
import remarkRoute from './remark/route';
import remarkTabs from './remark/tabs';
import { transformerLang, transformerLineNumbers, transformerTitle } from './shiki';

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkDirective)
	.use(remarkTabs)
	.use(remarkAdmonitions)
	.use(remarkRoute)
	.use(remarkRehype)
	.use(rehypeSlug)
	.use(rehypeAutolinkHeadings, {
		behavior: 'append',
		content: { type: 'text', value: '#' },
	})
	.use(rehypeWrapSections)
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
	.use(rehypeStringify);

export default processor;

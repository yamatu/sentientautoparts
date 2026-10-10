import sanitizeHtml from 'sanitize-html';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Imported HTML and future admin edits are both untrusted. Never render scripts,
// events, inline styles, iframes or legacy tracking pixels into the storefront.
export default function RichText({ content = '' }: { content?: string }) {
  if (!/<[a-z][\s\S]*>/i.test(content)) return <div className="legacy-rich"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ h1: ({ children }) => <h2>{children}</h2> }}>{content}</ReactMarkdown></div>;
  const html = sanitizeHtml(content, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: { a: ['href', 'title', 'rel'], img: ['src', 'alt', 'width', 'height', 'loading'], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: { img: sanitizeHtml.simpleTransform('img', { loading: 'lazy' }), a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
  });
  return <div className="legacy-rich" dangerouslySetInnerHTML={{ __html: html }} />;
}

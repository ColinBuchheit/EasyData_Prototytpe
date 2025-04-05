import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  return (
    <SyntaxHighlighter
      language={language}
      style={oneDark}
      wrapLines
      showLineNumbers
      customStyle={{
        borderRadius: '0.5rem',
        fontSize: '0.9rem',
        padding: '1rem',
        backgroundColor: '#1e1e2f',
      }}
    >
      {value}
    </SyntaxHighlighter>
  );
};

export default CodeBlock;

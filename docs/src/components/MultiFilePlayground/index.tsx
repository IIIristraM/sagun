import React, { useState, useCallback, useMemo, type ReactNode, memo } from 'react';

import { transform, availablePlugins } from '@babel/standalone';
import { LiveProvider, LivePreview } from 'react-live';
import { Highlight, PrismTheme } from 'prism-react-renderer';
import Editor from 'react-simple-code-editor';

import BrowserOnly from '@docusaurus/BrowserOnly';
import { usePrismTheme } from '@docusaurus/theme-common';
// @ts-expect-error - Docusaurus theme alias
import ReactLiveScope from '@theme/ReactLiveScope';

import SagunProvider, { Errors } from '../SagunProvider';

import styles from './styles.module.css';

interface FileDefinition {
  name: string;
  code: string;
  language?: string;
  hidden?: boolean;
}

interface MultiFilePlaygroundProps {
  files: FileDefinition[];
  scope?: Record<string, unknown>;
  noInline?: boolean;
}

// Transform code using Babel with decorators support
const babelTransformCode = (code: string): string => {
  try {
    const result = transform(code, {
      presets: ['react'],
      plugins: [
        [availablePlugins['proposal-decorators'], { legacy: true }],
        [availablePlugins['proposal-class-properties'], { loose: true }],
      ],
      filename: 'playground.tsx',
    });
    return result.code || code;
  } catch (error) {
    console.error('Babel transform error:', error);
    return code;
  }
};

function useCode({files: initialFiles}: Pick<MultiFilePlaygroundProps, 'files'>) {
    const [files, setFiles] = useState(initialFiles);
  
    const [combinedCode, visibleFiles] = useMemo(() => {
        const visibleFiles = [];
        let code = '';
        for (const file of files) {
            code += file.code + '\n\n';
            if (!file.hidden) {
                visibleFiles.push(file);
            }
        }

        return [code, visibleFiles];
    }, [files]);

    return {
        setFiles,
        visibleFiles,
        combinedCode: combinedCode.trim(),
    };
}

function useTheme() {
    const prismTheme = usePrismTheme();

    // Create highlight function for the editor
    const highlightCode = useCallback((code: string, language: string) => {
        return (
            <Highlight theme={prismTheme} code={code} language={language}>
                {({ tokens, getLineProps, getTokenProps }) => (
                    <>
                        {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })}>
                            {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                            ))}
                        </div>
                        ))}
                    </>
                )}
            </Highlight>
        );
    }, [prismTheme]);

    // Convert prism theme to CSS style object for editor background
    const editorStyle = useMemo(() => ({
        fontFamily: 'var(--ifm-font-family-monospace)',
        fontSize: 14,
        lineHeight: 1.6,
        ...prismTheme.plain,
    }), [prismTheme]);

    return {
        highlightCode,
        editorStyle,
        prismTheme,
    };
}

const Preview = memo(function Preview({
    combinedCode, 
    scope, 
    noInline,
    prismTheme
}: {
    combinedCode: string, 
    scope: Record<string, unknown>, 
    noInline: boolean, 
    prismTheme: PrismTheme
}) {
    const mergedScope = useMemo(() => ({ ...ReactLiveScope, ...scope }), [scope]);

    const transformCode = useCallback((code: string): string => {
        return `${babelTransformCode(code)};`;
    }, []);

    return (
        <SagunProvider>
            <LiveProvider
                code={combinedCode}
                scope={mergedScope}
                noInline={noInline}
                theme={prismTheme}
                transformCode={transformCode}
            >
                <div className={styles.previewPanel}>
                    <div className={styles.previewHeader}>Preview</div>
                    <div className={styles.preview}>
                        <LivePreview />
                    </div>
                    <Errors />
                </div>
            </LiveProvider>
        </SagunProvider>
    )
})

const EMPTY_SCOPE = {};

function _MultiFilePlayground({
  files,
  scope = EMPTY_SCOPE,
  noInline = true,
}: MultiFilePlaygroundProps): ReactNode {
    const [activeTab, setActiveTab] = useState(0);

    const { highlightCode, editorStyle, prismTheme } = useTheme();
    const { setFiles, visibleFiles, combinedCode } = useCode({ files });
    const activeFile = visibleFiles[activeTab];

    const handleCodeChange = useCallback((fileIndex: number, newCode: string) => {
        setFiles(prevFiles => {
            const visible = prevFiles.filter(f => !f.hidden);
            const targetFile = visible[fileIndex];
            return prevFiles.map(f => 
                f.name === targetFile.name ? { ...f, code: newCode } : f
            );
        });
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.tabs}>
                {visibleFiles.map((file, index) => (
                    <button
                    key={file.name}
                    className={`${styles.tab} ${activeTab === index ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab(index)}
                    type="button"
                    >
                        {file.name}
                    </button>
                ))}
            </div>

            <div className={styles.codePanel}>
                {activeFile && (
                    <Editor
                        key={activeFile.name}
                        value={activeFile.code}
                        onValueChange={(newCode) => handleCodeChange(activeTab, newCode)}
                        highlight={(code) => highlightCode(code, activeFile.language || 'tsx')}
                        padding={16}
                        style={editorStyle}
                        className={styles.editor}
                        textareaClassName={styles.editorTextarea}
                        preClassName={styles.editorPre}
                    />
                )}
            </div>
            
            <Preview 
                combinedCode={combinedCode} 
                scope={scope}
                noInline={noInline} 
                prismTheme={prismTheme} 
            />
        </div>
    );
}

export default function MultiFilePlayground(props: MultiFilePlaygroundProps): ReactNode {
    return (
        <BrowserOnly>{() => <_MultiFilePlayground {...props} />}</BrowserOnly>
    );
}
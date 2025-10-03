'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { getMDXComponent } from 'vibe-overlord/client';
import Demo from '@/components/demo';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import * as ApiUtils from '@/utils/api';

// Error boundary to catch runtime errors in the generated component
class ComponentErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Generated component runtime error:', error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
                    <strong>Component error:</strong> {this.state.error?.message}
                </div>
            );
        }
        return this.props.children;
    }
}

export default function Home() {
    const [prompt, setPrompt] = useState('');
    const [componentCode, setComponentCode] = useState<string | null>(null);
    const [compiledComponent, setCompiledComponent] = useState<React.ComponentType<any> | null>(null);
    const [frontmatter, setFrontmatter] = useState<any>(null);
    const [spec, setSpec] = useState<any>(null);
    const [catalogStats, setCatalogStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [provider, setProvider] = useState<'openai' | 'anthropic' | 'google'>('openai');
    const [model, setModel] = useState('');
    const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'spec' | 'metadata'>('preview');

    const handleGenerate = async () => {
        if (process.env.NODE_ENV === 'development') {
            console.log('Generate button clicked');
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt,
                    provider: {
                        provider,
                        model: model || undefined
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const { code, frontmatter, spec, catalogStats } = await response.json();
            setComponentCode(code);
            setFrontmatter(frontmatter);
            setSpec(spec);
            setCatalogStats(catalogStats);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Component generation error:', error);
            }

            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            setError(errorMessage);
        }

        setLoading(false);
    };

    // Compile the MDX code after React has committed the DOM update
    useEffect(() => {
        if (!componentCode) {
            setCompiledComponent(null);
            return;
        }

        try {
            const Component = getMDXComponent(componentCode);
            setCompiledComponent(() => Component);
        } catch (compileError) {
            if (process.env.NODE_ENV === 'development') {
                console.error('MDX compilation error:', compileError);
            }
            const errorMessage = compileError instanceof Error
                ? compileError.message
                : 'Failed to compile generated component';
            setError(errorMessage);
        }
    }, [componentCode]);

    const examplePrompts = [
        'Create a user profile card with avatar, name, email, and bio',
        'Create a pricing table with three tiers using Card and Button components',
        'Create a blog post list that fetches posts using fetchPosts',
        'Create a contact form with validation and error messages',
        'Create a data table showing users with sortable columns',
        'Create a modal dialog for confirming delete actions',
        'Create a dashboard with key metrics in cards',
        'Create a todo list with add, complete, and delete functionality'
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-gray-900 mb-3">
                        Vibe Overlord
                    </h1>
                    <p className="text-xl text-gray-600 mb-2">
                        AI-Powered React Component Generation
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap text-sm">
                        <Badge variant="primary">Auto-Discovery</Badge>
                        <Badge variant="success">Two-Phase Generation</Badge>
                        <Badge variant="info">AST Validation</Badge>
                        <Badge variant="warning">Self-Healing</Badge>
                    </div>
                    {catalogStats && (
                        <p className="text-sm text-gray-500 mt-2">
                            📦 Discovered: {catalogStats.components} components, {catalogStats.utilities} utilities
                        </p>
                    )}
                </div>

                {/* Input Section */}
                <Card className="mb-6" shadow="lg">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="prompt" className="block text-sm font-semibold text-gray-700 mb-2">
                                Describe your component:
                            </label>
                            <textarea
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                                rows={4}
                                placeholder="e.g., Create a user profile card with avatar, name, email, and a button to edit"
                                disabled={loading}
                            />
                        </div>

                        {/* Provider Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
                                    AI Provider:
                                </label>
                                <select
                                    id="provider"
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value as any)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    disabled={loading}
                                >
                                    <option value="openai">OpenAI (GPT-4o)</option>
                                    <option value="anthropic">Anthropic (Claude)</option>
                                    <option value="google">Google (Gemini)</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                                    Model (optional):
                                </label>
                                <input
                                    id="model"
                                    type="text"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., gpt-4o-mini"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={loading || !prompt.trim()}
                            variant="primary"
                            size="lg"
                            className="w-full"
                        >
                            {loading ? (
                                <>
                                    <Icon name="loader" size={20} className="animate-spin mr-2" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Icon name="sparkles" size={20} className="mr-2" />
                                    Generate Component
                                </>
                            )}
                        </Button>
                    </div>
                </Card>

                {/* Example Prompts */}
                <Card className="mb-6" title="Example Prompts" padding="md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {examplePrompts.map((example, index) => (
                            <button
                                key={index}
                                onClick={() => setPrompt(example)}
                                className="text-left p-3 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                disabled={loading}
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
                        <div className="flex items-start">
                            <Icon name="alert-circle" size={20} className="mr-2 mt-0.5" />
                            <div>
                                <strong className="font-semibold">Error:</strong>
                                <p className="mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Section */}
                {compiledComponent && (
                    <div className="space-y-4">
                        {/* Tabs */}
                        <div className="flex gap-2 border-b border-gray-300">
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={`px-4 py-2 font-medium transition-colors ${activeTab === 'preview'
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                <Icon name="eye" size={18} className="inline mr-2" />
                                Preview
                            </button>
                            <button
                                onClick={() => setActiveTab('code')}
                                className={`px-4 py-2 font-medium transition-colors ${activeTab === 'code'
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                <Icon name="code" size={18} className="inline mr-2" />
                                Code
                            </button>
                            {spec && (
                                <button
                                    onClick={() => setActiveTab('spec')}
                                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'spec'
                                            ? 'text-blue-600 border-b-2 border-blue-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon name="file-text" size={18} className="inline mr-2" />
                                    Specification
                                </button>
                            )}
                            <button
                                onClick={() => setActiveTab('metadata')}
                                className={`px-4 py-2 font-medium transition-colors ${activeTab === 'metadata'
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                <Icon name="info" size={18} className="inline mr-2" />
                                Metadata
                            </button>
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'preview' && (
                            <Card title="Component Preview" shadow="lg" padding="lg">
                                <ComponentErrorBoundary>
                                    {compiledComponent && React.createElement(compiledComponent, {
                                        components: { Demo, Icon, Button, Card, Badge },
                                        ...ApiUtils
                                    })}
                                </ComponentErrorBoundary>
                            </Card>
                        )}

                        {activeTab === 'code' && (
                            <Card title="Generated Code" shadow="lg" padding="none">
                                <pre className="p-6 overflow-x-auto bg-gray-900 text-gray-100 rounded-lg text-sm">
                                    <code>{componentCode}</code>
                                </pre>
                            </Card>
                        )}

                        {activeTab === 'spec' && spec && (
                            <Card title="Component Specification" shadow="lg" padding="lg">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">{spec.name}</h3>
                                        <p className="text-gray-600">{spec.description}</p>
                                        <Badge variant="info" className="mt-2">{spec.category}</Badge>
                                    </div>

                                    {spec.state && spec.state.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-2">State:</h4>
                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                {spec.state.map((s: any, i: number) => (
                                                    <li key={i}>
                                                        <strong>{s.name}</strong>: {s.type} - {s.description}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {spec.props && spec.props.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-2">Props:</h4>
                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                {spec.props.map((p: any, i: number) => (
                                                    <li key={i}>
                                                        <strong>{p.name}</strong>: {p.type} {p.required && <Badge variant="warning" size="sm">required</Badge>}
                                                        <p className="ml-6 text-gray-600">{p.description}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {spec.accessibility && (
                                        <div>
                                            <h4 className="font-semibold mb-2">Accessibility:</h4>
                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                {spec.accessibility.hasKeyboardNav && <li>Keyboard navigation supported</li>}
                                                {spec.accessibility.ariaLabels && spec.accessibility.ariaLabels.map((label: string, i: number) => (
                                                    <li key={i}>ARIA: {label}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                        {activeTab === 'metadata' && frontmatter && (
                            <Card title="Component Metadata" shadow="lg" padding="lg">
                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    {frontmatter.title && (
                                        <>
                                            <dt className="font-semibold text-gray-700">Title:</dt>
                                            <dd className="text-gray-600">{frontmatter.title}</dd>
                                        </>
                                    )}
                                    {frontmatter.description && (
                                        <>
                                            <dt className="font-semibold text-gray-700">Description:</dt>
                                            <dd className="text-gray-600">{frontmatter.description}</dd>
                                        </>
                                    )}
                                    {frontmatter.category && (
                                        <>
                                            <dt className="font-semibold text-gray-700">Category:</dt>
                                            <dd>
                                                <Badge variant="info">{frontmatter.category}</Badge>
                                            </dd>
                                        </>
                                    )}
                                    {frontmatter.tags && Array.isArray(frontmatter.tags) && (
                                        <>
                                            <dt className="font-semibold text-gray-700">Tags:</dt>
                                            <dd className="flex gap-2 flex-wrap">
                                                {frontmatter.tags.map((tag, i) => (
                                                    <Badge key={i} variant="secondary" size="sm">{tag}</Badge>
                                                ))}
                                            </dd>
                                        </>
                                    )}
                                    {frontmatter.version && (
                                        <>
                                            <dt className="font-semibold text-gray-700">Version:</dt>
                                            <dd className="text-gray-600">{frontmatter.version}</dd>
                                        </>
                                    )}
                                </dl>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

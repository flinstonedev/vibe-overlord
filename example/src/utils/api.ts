// Utility functions for making API calls in generated components
// Available endpoints from JSONPlaceholder (https://jsonplaceholder.typicode.com/)

// Security: Allowlisted domains for API calls
const ALLOWED_DOMAINS = [
    'jsonplaceholder.typicode.com',
    'catfact.ninja'
];

// Security: Validate URL before making requests
function validateUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        return ALLOWED_DOMAINS.includes(urlObj.hostname.toLowerCase()) &&
            (urlObj.protocol === 'https:' || urlObj.protocol === 'http:');
    } catch {
        return false;
    }
}

// Security: Validate response size and content type
function validateResponse(response: Response): boolean {
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');

    // Check content length (max 1MB)
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
        throw new Error('Response too large');
    }

    // Check content type
    if (contentType && !contentType.includes('application/json')) {
        throw new Error('Invalid content type');
    }

    return true;
}

// Security: Sanitize API response data
function sanitizeApiData<T>(data: T): T {
    if (typeof data === 'object' && data !== null) {
        // Remove any potentially dangerous fields
        const sanitized = { ...data };
        const dangerousFields = ['script', 'onclick', 'onload', 'javascript:', 'data:'];

        Object.keys(sanitized).forEach(key => {
            const value = (sanitized as Record<string, unknown>)[key];
            if (typeof value === 'string') {
                // Check for dangerous content
                const hasUnsafeContent = dangerousFields.some(dangerous =>
                    value.toLowerCase().includes(dangerous.toLowerCase())
                );
                if (hasUnsafeContent) {
                    (sanitized as Record<string, unknown>)[key] = '[Content filtered for security]';
                }
            }
        });

        return sanitized;
    }

    return data;
}

export interface Post {
    id: number;
    title: string;
    body: string;
    userId: number;
}

export interface User {
    id: number;
    name: string;
    username: string;
    email: string;
    address: {
        street: string;
        suite: string;
        city: string;
        zipcode: string;
        geo: {
            lat: string;
            lng: string;
        };
    };
    phone: string;
    website: string;
    company: {
        name: string;
        catchPhrase: string;
        bs: string;
    };
}

export interface Todo {
    id: number;
    title: string;
    completed: boolean;
    userId: number;
}

/**
 * Fetch posts from JSONPlaceholder API
 * @param limit - Optional limit for number of posts (default: 10, max: 100)
 * @returns Promise<Post[]>
 */
export async function fetchPosts(limit = 10): Promise<Post[]> {
    try {
        // Security: Validate and sanitize limit parameter
        const sanitizedLimit = Math.min(Math.max(parseInt(String(limit)) || 10, 1), 100);

        const url = `https://jsonplaceholder.typicode.com/posts?_limit=${sanitizedLimit}`;

        // Security: Validate URL
        if (!validateUrl(url)) {
            throw new Error('Invalid URL');
        }

        const response = await fetch(url);

        // Security: Validate response
        validateResponse(response);

        if (!response.ok) {
            throw new Error('Failed to fetch posts');
        }

        const data = await response.json();

        // Security: Sanitize response data
        return Array.isArray(data) ? data.map(sanitizeApiData) : [];
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching posts:', error);
        }
        return [];
    }
}

/**
 * Fetch a specific post by ID
 * @param id - Post ID (1-100)
 * @returns Promise<Post | null>
 */
export async function fetchPost(id: number): Promise<Post | null> {
    try {
        // Security: Validate and sanitize ID parameter
        const sanitizedId = Math.min(Math.max(parseInt(String(id)) || 1, 1), 100);

        const url = `https://jsonplaceholder.typicode.com/posts/${sanitizedId}`;

        // Security: Validate URL
        if (!validateUrl(url)) {
            throw new Error('Invalid URL');
        }

        const response = await fetch(url);

        // Security: Validate response
        validateResponse(response);

        if (!response.ok) {
            throw new Error('Failed to fetch post');
        }

        const data = await response.json();

        // Security: Sanitize response data
        return sanitizeApiData(data);
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching post:', error);
        }
        return null;
    }
}

/**
 * Fetch users from JSONPlaceholder API
 * @param limit - Optional limit for number of users (default: 5, max: 10)
 * @returns Promise<User[]>
 */
export async function fetchUsers(limit = 5): Promise<User[]> {
    try {
        const sanitizedLimit = Math.min(Math.max(parseInt(String(limit)) || 5, 1), 10);
        const url = `https://jsonplaceholder.typicode.com/users?_limit=${sanitizedLimit}`;

        if (!validateUrl(url)) {
            throw new Error('Invalid URL');
        }

        const response = await fetch(url);
        validateResponse(response);

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        return Array.isArray(data) ? data.map(sanitizeApiData) : [];
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching users:', error);
        }
        return [];
    }
}

/**
 * Fetch a specific user by ID
 * @param id - User ID (1-10)
 * @returns Promise<User | null>
 */
export async function fetchUser(id: number): Promise<User | null> {
    try {
        const sanitizedId = Math.min(Math.max(parseInt(String(id)) || 1, 1), 10);
        const url = `https://jsonplaceholder.typicode.com/users/${sanitizedId}`;

        if (!validateUrl(url)) {
            throw new Error('Invalid URL');
        }

        const response = await fetch(url);
        validateResponse(response);

        if (!response.ok) {
            throw new Error('Failed to fetch user');
        }

        const data = await response.json();
        return sanitizeApiData(data);
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching user:', error);
        }
        return null;
    }
}

/**
 * Fetch todos from JSONPlaceholder API
 * @param limit - Optional limit for number of todos (default: 10, max: 50)
 * @param userId - Optional filter by user ID (1-10)
 * @returns Promise<Todo[]>
 */
export async function fetchTodos(limit = 10, userId?: number): Promise<Todo[]> {
    try {
        const sanitizedLimit = Math.min(Math.max(parseInt(String(limit)) || 10, 1), 50);
        let url = `https://jsonplaceholder.typicode.com/todos?_limit=${sanitizedLimit}`;

        if (userId) {
            const sanitizedUserId = Math.min(Math.max(parseInt(String(userId)) || 1, 1), 10);
            url += `&userId=${sanitizedUserId}`;
        }

        if (!validateUrl(url)) {
            throw new Error('Invalid URL');
        }

        const response = await fetch(url);
        validateResponse(response);

        if (!response.ok) {
            throw new Error('Failed to fetch todos');
        }

        const data = await response.json();
        return Array.isArray(data) ? data.map(sanitizeApiData) : [];
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching todos:', error);
        }
        return [];
    }
}

/**
 * Fetch a random cat fact from cat facts API
 * @returns Promise<{content: string, author: string} | null>
 */
export async function fetchRandomQuote(): Promise<{ content: string, author: string } | null> {
    try {
        const url = 'https://catfact.ninja/fact';

        // Security: Validate URL
        if (!validateUrl(url)) {
            throw new Error('Invalid URL');
        }

        const response = await fetch(url);

        // Security: Validate response
        validateResponse(response);

        if (!response.ok) {
            throw new Error('Failed to fetch cat fact');
        }

        const data = await response.json();

        // Security: Validate and sanitize the response structure
        if (typeof data !== 'object' || !data.fact) {
            throw new Error('Invalid response format');
        }

        const sanitizedData = sanitizeApiData(data);

        return {
            content: String(sanitizedData.fact).substring(0, 500), // Limit content length
            author: 'Cat Facts'    // Static author since this API doesn't provide authors
        };
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching cat fact:', error);
        }
        return null;
    }
} 
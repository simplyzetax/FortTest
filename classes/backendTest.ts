import fs from 'fs/promises';
import logger from '../utils/logger';
import type { AuthResponse } from '../utils/auth';

type BodyType = 'json' | 'form' | 'formData' | 'text';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface TestOptions {
    method?: HttpMethod;
    endpoint: string;
    bodyType?: BodyType;
    body?: any;
    headers?: Record<string, string>;
    queryParams?: Record<string, string | number | boolean>;
    bearerAuth?: boolean;
    timeout?: number;
}

interface TestResult {
    status: number;
    statusText: string;
    data: any;
    headers: any;
    responseTime: number;
    description: string;
    expects: {
        toHaveStatus: (status: number) => TestResult;
        toHaveData: (predicate: (data: any) => boolean) => TestResult;
        toMatchData: (expected: any) => TestResult;
        toHaveHeader: (header: string, value?: string) => TestResult;
        toHaveProperty: (path: string, value?: any) => TestResult;
    }
}

// Add a new type that combines Promise with test expectations
type TestPromise = Promise<TestResult> & {
    expects: {
        toHaveStatus: (status: number) => Promise<TestResult>;
        toHaveData: (predicate: (data: any) => boolean) => Promise<TestResult>;
        toMatchData: (expected: any) => Promise<TestResult>;
        toHaveHeader: (header: string, value?: string) => Promise<TestResult>;
        toHaveProperty: (path: string, value?: any) => Promise<TestResult>;
    }
};

export class BackendTest {
    private baseUrl: string;
    private defaultHeaders: Record<string, string> = {};
    private authResponse: AuthResponse;

    /**
       * Creates a new BackendTest instance for API testing
       * @param baseUrl Base URL for API requests
       * @param bearerToken Optional default bearer token for authentication
       */
    constructor(baseUrl: string, authResponse: AuthResponse) {
        this.baseUrl = baseUrl;
        this.authResponse = authResponse;

        logger.info(`BackendTest initialized with base URL: ${this.baseUrl}`);
    }

    /**
     * Creates a test for the specified endpoint with description
     */
    test(description: string, options: TestOptions): TestPromise {
        const {
            method = 'GET',
            endpoint,
            bodyType = 'json',
            body,
            headers = {},
            queryParams = {},
            bearerAuth = false,
            timeout = 30000
        } = options;

        logger.info(`⏳ Running test: ${description}`);

        const resultPromise = this.executeRequest(method, endpoint, {
            bodyType,
            body,
            headers,
            queryParams,
            bearerAuth,
            timeout,
            description
        });

        // Create the expectation methods on the promise itself
        const testPromise = resultPromise as TestPromise;
        testPromise.expects = {
            toHaveStatus: async (expectedStatus: number) => {
                const result = await resultPromise;
                const success = result.status === expectedStatus;
                if (success) {
                    logger.info(`✅ ${description}: Status is ${expectedStatus}`);
                } else {
                    logger.error(`❌ ${description}: Expected status ${expectedStatus}, got ${result.status}`);
                }
                return result;
            },
            toHaveData: async (predicate: (data: any) => boolean) => {
                const result = await resultPromise;
                const success = predicate(result.data);
                if (success) {
                    logger.info(`✅ ${description}: Data validation passed`);
                } else {
                    logger.error(`❌ ${description}: Data validation failed`);
                }
                return result;
            },
            toMatchData: async (expected: any) => {
                const result = await resultPromise;
                const success = JSON.stringify(result.data) === JSON.stringify(expected);
                if (success) {
                    logger.info(`✅ ${description}: Data matches expected`);
                } else {
                    logger.error(`❌ ${description}: Data doesn't match expected`);
                    logger.debug({
                        expected,
                        actual: result.data,
                    });
                }
                return result;
            },
            toHaveHeader: async (header: string, value?: string) => {
                const result = await resultPromise;
                const headerValue = result.headers.get(header);
                const success = value ? headerValue === value : Boolean(headerValue);
                if (success) {
                    logger.info(`✅ ${description}: Header ${header} validation passed`);
                } else {
                    logger.error(`❌ ${description}: Header ${header} validation failed`);
                }
                return result;
            },
            toHaveProperty: async (path: string, value?: any) => {
                const result = await resultPromise;
                const props = path.split('.');
                let current = result.data;

                for (const prop of props) {
                    if (current === undefined || current === null) {
                        logger.error(`❌ ${description}: Property ${path} not found`);
                        return result;
                    }
                    current = current[prop];
                }

                const success = value !== undefined ? current === value : current !== undefined;
                if (success) {
                    logger.info(`✅ ${description}: Property ${path} validation passed`);
                } else {
                    logger.error(`❌ ${description}: Property ${path} validation failed`);
                }
                return result;
            },
        };

        return testPromise;
    }

    /**
     * Test GET request
     */
    get(description: string, endpoint: string, options: Omit<TestOptions, 'method' | 'endpoint'> = {}): Promise<TestResult> {
        return this.test(description, { ...options, method: 'GET', endpoint });
    }

    /**
     * Test POST request
     */
    post(description: string, endpoint: string, options: Omit<TestOptions, 'method' | 'endpoint'> = {}): Promise<TestResult> {
        return this.test(description, { ...options, method: 'POST', endpoint });
    }

    /**
     * Test PUT request
     */
    put(description: string, endpoint: string, options: Omit<TestOptions, 'method' | 'endpoint'> = {}): Promise<TestResult> {
        return this.test(description, { ...options, method: 'PUT', endpoint });
    }

    /**
     * Test PATCH request
     */
    patch(description: string, endpoint: string, options: Omit<TestOptions, 'method' | 'endpoint'> = {}): Promise<TestResult> {
        return this.test(description, { ...options, method: 'PATCH', endpoint });
    }

    /**
     * Test DELETE request
     */
    delete(description: string, endpoint: string, options: Omit<TestOptions, 'method' | 'endpoint'> = {}): Promise<TestResult> {
        return this.test(description, { ...options, method: 'DELETE', endpoint });
    }

    private async executeRequest(
        method: HttpMethod,
        endpoint: string,
        {
            bodyType = 'json',
            body,
            headers = {},
            queryParams = {},
            bearerAuth = false,
            timeout = 30000,
            description
        }: Omit<TestOptions, 'method' | 'endpoint'> & { description: string }
    ): Promise<TestResult> {
        // Build URL with query parameters
        let url = `${this.baseUrl}${endpoint}`;
        if (Object.keys(queryParams).length > 0) {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(queryParams)) {
                params.append(key, String(value));
            }
            url += `?${params.toString()}`;
        }

        // Prepare headers
        const requestHeaders = {
            ...this.defaultHeaders,
            ...headers
        };

        // Handle bearer token if specific to this request
        if (bearerAuth && this.authResponse.access_token) {
            requestHeaders['Authorization'] = `Bearer ${this.authResponse.access_token}`;
        }

        // Configure content type based on body type
        if (!requestHeaders['Content-Type']) {
            switch (bodyType) {
                case 'json':
                    requestHeaders['Content-Type'] = 'application/json';
                    break;
                case 'form':
                    requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
                    break;
                case 'text':
                    requestHeaders['Content-Type'] = 'text/plain';
                    break;
                // formData doesn't need a Content-Type as the fetch library sets it with the boundary
            }
        }

        // Prepare request options
        const requestOptions: any = {
            method,
            headers: requestHeaders,
            timeout,
        };

        // Process body based on type
        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
            switch (bodyType) {
                case 'json':
                    requestOptions.body = JSON.stringify(body);
                    break;
                case 'form':
                    const formParams = new URLSearchParams();
                    Object.entries(body).forEach(([key, value]) => {
                        formParams.append(key, String(value));
                    });
                    requestOptions.body = formParams.toString();
                    break;
                case 'formData':
                    const formData = new FormData();
                    Object.entries(body).forEach(([key, value]) => {
                        if (value instanceof Blob) {
                            formData.append(key, value);
                        }
                        else if (value instanceof File) {
                            formData.append(key, value);
                        } else {
                            formData.append(key, String(value));
                        }
                    });
                    requestOptions.body = formData;
                    // The FormData object sets its own headers
                    delete requestOptions.headers['Content-Type'];
                    break;
                case 'text':
                    requestOptions.body = String(body);
                    break;
            }
        }

        try {
            // Send request and measure time
            const startTime = Date.now();
            const response = await fetch(url, requestOptions);
            const responseTime = Date.now() - startTime;

            // Parse response based on content type
            let responseData: any;
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            /*             // Log response details
                        logger.info({
                            message: `Test Result: ${description} - Status ${response.status} (${responseTime}ms)`,
                            status: response.status,
                            responseTime,
                            data: responseData,
                        }); */

            // Create the test result with expectation methods
            const result: TestResult = {
                status: response.status,
                statusText: response.statusText,
                data: responseData,
                headers: response.headers,
                responseTime,
                description,
                expects: {
                    toHaveStatus: (expectedStatus: number) => {
                        const success = response.status === expectedStatus;
                        if (success) {
                            logger.info(`✅ ${description}: Status is ${expectedStatus}`);
                        } else {
                            logger.error(`❌ ${description}: Expected status ${expectedStatus}, got ${response.status}`);
                        }
                        return result;
                    },
                    toHaveData: (predicate: (data: any) => boolean) => {
                        const success = predicate(responseData);
                        if (success) {
                            logger.info(`✅ ${description}: Data validation passed`);
                        } else {
                            logger.error(`❌ ${description}: Data validation failed`);
                        }
                        return result;
                    },
                    toMatchData: (expected: any) => {
                        const success = JSON.stringify(responseData) === JSON.stringify(expected);
                        if (success) {
                            logger.info(`✅ ${description}: Data matches expected`);
                        } else {
                            logger.error(`❌ ${description}: Data doesn't match expected`);
                            logger.debug({
                                expected,
                                actual: responseData,
                            });
                        }
                        return result;
                    },
                    toHaveHeader: (header: string, value?: string) => {
                        const headerValue = response.headers.get(header);
                        const success = value ? headerValue === value : Boolean(headerValue);
                        if (success) {
                            logger.info(`✅ ${description}: Header ${header} validation passed`);
                        } else {
                            logger.error(`❌ ${description}: Header ${header} validation failed`);
                        }
                        return result;
                    },
                    toHaveProperty: (path: string, value?: any) => {
                        const props = path.split('.');
                        let current = responseData;

                        for (const prop of props) {
                            if (current === undefined || current === null) {
                                logger.error(`❌ ${description}: Property ${path} not found`);
                                return result;
                            }
                            current = current[prop];
                        }

                        const success = value !== undefined ? current === value : current !== undefined;
                        if (success) {
                            logger.info(`✅ ${description}: Property ${path} validation passed`);
                        } else {
                            logger.error(`❌ ${description}: Property ${path} validation failed`);
                        }
                        return result;
                    },
                }
            };

            return result;
        } catch (error) {
            logger.error({
                message: `❌ Test failed: ${description}`,
                error,
            });
            throw error;
        }
    }

    public static create(
        baseUrl: string,
        authResponse: AuthResponse,
        bearerToken?: string,
    ): BackendTest {
        return new BackendTest(baseUrl, authResponse);
    }

    static async collectTestFiles(directory: string): Promise<string[]> {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        const files: string[] = [];

        for (const entry of entries) {
            const path = `${directory}/${entry.name}`;

            if (entry.isDirectory()) {
                // Recursively collect files from subdirectory
                const subFiles = await BackendTest.collectTestFiles(path);
                files.push(...subFiles);
            } else if (entry.isFile() && entry.name.endsWith('.ts')) {
                // Add TypeScript files
                files.push(path);
            }
        }

        return files;
    }
}

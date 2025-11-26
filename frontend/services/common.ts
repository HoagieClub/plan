export enum HttpRequestType {
	GET = 'GET',
	POST = 'POST',
	PUT = 'PUT',
	DELETE = 'DELETE',
}

export function buildRequest(method: HttpRequestType, body?: object): RequestInit {
	return {
		method,
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		...(body && { body: JSON.stringify(body) }),
	};
}

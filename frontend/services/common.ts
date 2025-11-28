export enum HttpRequestType {
	GET = 'GET',
	POST = 'POST',
	PUT = 'PUT',
	DELETE = 'DELETE',
}

export function buildRequest(
	method: HttpRequestType,
	headers?: object,
	body?: object
): RequestInit {
	return {
		method,
		headers: { 'Content-Type': 'application/json', ...headers },
		credentials: 'include',
		...(body && { body: JSON.stringify(body) }),
	};
}

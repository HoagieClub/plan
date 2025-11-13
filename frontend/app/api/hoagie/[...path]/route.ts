import { NextResponse } from 'next/server';

import { auth0 } from '@/lib/auth0';

import type { NextRequest, RequestInit } from 'next/dist/server/web/spec-extension/request';

async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
	const path = (await params).path.join('/');

	const fetchReq: RequestInit = {
		method: request.method,
		headers: {},
	};

	// Check if this is a file upload
	const contentType = request.headers.get('content-type');
	const isMultipart = contentType?.includes('multipart/form-data');

	if (request.method !== 'GET') {
		if (isMultipart) {
			// For file uploads, preserve FormData
			fetchReq.body = await request.formData();
		} else {
			// For JSON requests, convert to text and set content-type
			fetchReq.body = await request.text();
			fetchReq.headers['Content-Type'] = 'application/json';
			fetchReq.headers['Accept'] = 'application/json';
		}
	}

	if (request.headers.has('X-CSRFToken')) {
		fetchReq.headers['X-CSRFToken'] = request.headers.get('X-CSRFToken');
	}

	try {
		// TODO: Does this need to be called in the middleware too?
		const accessToken = await auth0.getAccessToken();

		fetchReq.headers = {
			...fetchReq.headers,
			Authorization: `Bearer ${accessToken.token}`,
		};
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 401 });
	}

	const searchParams = request.nextUrl.searchParams.toString();
	const backendUrl = `${process.env.BACKEND}/${path}/${searchParams ? `?${searchParams}` : ''}`;

	return await proxyRequest(backendUrl, fetchReq);
}

async function proxyRequest(url: string, fetchReq: RequestInit) {
	try {
		const response = await fetch(url, fetchReq);

		if (!response.ok) {
			const errorText = await response.text();
			return NextResponse.json({ error: errorText }, { status: response.status });
		} else if (response.status === 204) {
			return NextResponse.json({}, { status: 204 });
		} else {
			const data = await response.json();
			return NextResponse.json(data, { status: response.status });
		}
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 404 });
	}
}

// Delegate all http requests to the handler
export const GET = handler;
export const POST = handler;
export const DELETE = handler;

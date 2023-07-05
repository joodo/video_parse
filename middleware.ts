import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
    if (request.headers.get('Authorization') != 'no-token') {
        return NextResponse.redirect(new URL('/api/auth/unauthorized', request.url));
    }
}

export const config = {
    matcher: '/api/bilibili/:path*',
}

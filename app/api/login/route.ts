import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Forward the request to the PHP backend
    // Note: This runs on the server, so it avoids CORS/Mixed Content issues from the browser
    const response = await fetch('http://103.249.84.244/api_login.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    console.log('Backend raw response:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse backend response as JSON:', text);
      return NextResponse.json(
        { message: 'Invalid response from authentication server', details: text.substring(0, 100) },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Login failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

# Fin24x Frontend

Frontend application for Fin24x finance website.

## Setup

1. Install dependencies:
```bash
npm install
```

## Running the Development Server

Start the local development server:

```bash
npm start
```

The server will start on `http://localhost:3000`

Open your browser and navigate to:
- Homepage: `http://localhost:3000/index.html` or `http://localhost:3000/`
- About: `http://localhost:3000/about.html`
- Contact: `http://localhost:3000/contact.html`

## Requirements

- Make sure Strapi backend is running on `http://localhost:1337`
- If Strapi is running on a different port, update `frontend/js/config.js`

## Alternative: Using Python (if you have Python installed)

If you prefer not to use Node.js, you can use Python's built-in server:

```bash
cd frontend
python3 -m http.server 3000
```

Then open `http://localhost:3000` in your browser.

## Alternative: Using http-server (global install)

```bash
npm install -g http-server
cd frontend
http-server -p 3000
```


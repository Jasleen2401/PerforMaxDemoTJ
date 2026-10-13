# ==========================================
# Performax React + Vite Frontend Dockerfile
# Node 22 Alpine with Layer-Cached NPM Packages
# ==========================================
FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Clean-install all frontend dependencies inside the container
RUN npm ci

# Copy the rest of the frontend source code
COPY . .

EXPOSE 5173

# Start Vite dev server bound to all interfaces for container access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

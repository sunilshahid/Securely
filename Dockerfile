FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Prune dev dependencies for cleaner production image, optionally install only prod deps
RUN npm prune --production

FROM node:20-alpine

WORKDIR /app

# Copy the dist and node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# The bundled server.cjs needs the public dist folder for static asset serving
EXPOSE 3000
CMD ["npm", "run", "start"]

# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Allow passing Vite build-time envs into the image so Vite can embed them at build time
ARG VITE_STORMGLASS_API_KEY
ENV VITE_STORMGLASS_API_KEY=$VITE_STORMGLASS_API_KEY

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application (Vite will read import.meta.env.VITE_STORMGLASS_API_KEY at build time)
RUN npm run build

# Expose port 4173 (Vite preview default)
EXPOSE 4173

# Start the application in preview mode
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
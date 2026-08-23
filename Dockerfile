FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build the Vite frontend
# VITE_API_URL should point to the self-hosted root since backend/frontend are unified
ENV VITE_API_URL=/
RUN npm run build

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080
ENV PORT=8080

# Start the unified Express server
CMD ["node", "server.js"]

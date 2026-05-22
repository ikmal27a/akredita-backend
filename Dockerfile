FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate

# Copy app source
COPY src ./src

# Migration on start, then run
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

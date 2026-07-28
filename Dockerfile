FROM node:22-alpine AS base
WORKDIR /app

# --- API dependencies ---
FROM base AS api-deps
COPY server/package.json server/package-lock.json* ./
RUN npm install

# --- API build ---
FROM api-deps AS api-build
COPY server/ ./
RUN npm run build

# --- Client dependencies ---
FROM base AS client-deps
COPY package.json package-lock.json* ./
RUN npm install

# --- Client build ---
FROM client-deps AS client-build
ARG VITE_API_URL=/api
ARG VITE_DONOR_PORTAL_URL=http://donor.localhost:8080
ARG VITE_APP_PORTAL_URL=http://app.localhost:8080
ARG VITE_WEBSITE_URL=https://msctrust.org
ARG VITE_RAZORPAY_KEY_ID=
ARG VITE_SHOW_DEV_OTP=false
ARG VITE_MANUAL_PAYMENTS=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DONOR_PORTAL_URL=$VITE_DONOR_PORTAL_URL
ENV VITE_APP_PORTAL_URL=$VITE_APP_PORTAL_URL
ENV VITE_WEBSITE_URL=$VITE_WEBSITE_URL
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID
ENV VITE_SHOW_DEV_OTP=$VITE_SHOW_DEV_OTP
ENV VITE_MANUAL_PAYMENTS=$VITE_MANUAL_PAYMENTS
COPY . .
RUN npm run build

# --- Production ---
FROM base AS production
ENV NODE_ENV=production
WORKDIR /app

COPY --from=api-deps /app/node_modules ./server/node_modules
COPY server/package.json ./server/
COPY --from=api-build /app/dist ./server/dist
COPY --from=client-build /app/dist ./client/dist

RUN mkdir -p /app/uploads

COPY docker/nginx.conf /etc/nginx/nginx.conf

RUN apk add --no-cache nginx

COPY docker/start-prod.sh /start-prod.sh
RUN chmod +x /start-prod.sh

EXPOSE 80 3001
CMD ["/start-prod.sh"]

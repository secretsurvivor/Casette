# Stage 1: Build Angular
FROM node:22-alpine AS build
WORKDIR /app
COPY Casette.Frontend/package.json Casette.Frontend/package-lock.json ./
RUN npm ci
COPY Casette.Frontend/ ./
RUN npx ng build --configuration production

# Stage 2: Serve with nginx
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/casette/browser /usr/share/nginx/html
COPY Casette.AppHost/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

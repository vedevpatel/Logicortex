FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

EXPOSE 3000

CMD ["npm", "start"]
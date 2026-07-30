FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY demo ./demo

EXPOSE 4000
CMD ["npm", "run", "demo:start"]

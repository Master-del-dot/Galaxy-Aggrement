FROM node:20-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./tsconfig.json
COPY src ./src

RUN npm run build

ENV PORT=10000
EXPOSE 10000

CMD ["npm", "start"]

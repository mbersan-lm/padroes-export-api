FROM ghcr.io/puppeteer/puppeteer:22.0.0

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p /usr/local/share/fonts
COPY fonts/ /usr/local/share/fonts/
RUN fc-cache -f -v || true

EXPOSE 3000

CMD ["node", "server.js"]

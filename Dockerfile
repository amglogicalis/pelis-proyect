FROM node:20-alpine

RUN npm install -g webtorrent-cli

WORKDIR /tmp/stream

EXPOSE 8000

ENTRYPOINT ["webtorrent"]
CMD ["--help"]

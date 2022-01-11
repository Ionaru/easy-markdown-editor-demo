FROM node:16-alpine


## INSTALL SERVER

RUN mkdir -p /app /app/data
WORKDIR /app

# Install dependencies
COPY ./package.json ./package-lock.json ./tsconfig.json ./
RUN npm ci

# Build for production
COPY ./src ./src
ENV NODE_ENV production
RUN npm run build

# Add volumes
VOLUME /app/data


## RUN

ARG DEBUG
CMD ["npm", "start"]

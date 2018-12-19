FROM node:10-alpine
RUN mkdir /app/
WORKDIR /app/

## INSTALL SERVER

# Copy needed build files
COPY ./package.json .
COPY ./package-lock.json .
COPY ./tsconfig.json .
COPY ./gulpfile.ts .
COPY ./configuration configuration

# Copy source files
COPY ./src src

# Install server dependencies
RUN npm install

# Build server for production
RUN npm run build

# Add volumes
RUN mkdir /app/logs
VOLUME /app/logs
VOLUME /app/configuration


## RUN

EXPOSE  3099
ENV LEVEL debug
ENV NODE_ENV production
CMD ["npm", "run", "start"]
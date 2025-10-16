# Step 1: Use the official Node.js image as a base
# Using a specific version ensures consistency
FROM node:20-alpine AS base

# Step 2: Set the working directory inside the container
WORKDIR /app

# Step 3: Install dependencies
# We copy package.json and package-lock.json first to leverage Docker's layer caching.
# This way, dependencies are only re-installed if these files change.
COPY package*.json ./
RUN npm install

# Step 4: Copy the rest of the application code
COPY . .

# Step 5: Build the Next.js application for production
RUN npm run build

# Step 6: Define the command to start the application
# This will run the production server
CMD ["npm", "start"]

# Expose port 3000 to the outside world
EXPOSE 3000

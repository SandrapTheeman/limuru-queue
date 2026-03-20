#!/bin/bash
# Build and Push to Docker Hub
# Usage: ./build-push.sh your-dockerhub-username

set -e

if [ -z "$1" ]; then
    echo "Usage: ./build-push.sh your-dockerhub-username"
    echo "Example: ./build-push.sh johndoe"
    exit 1
fi

DOCKER_USER=$1
IMAGE_NAME="hqs-web"
TAG="latest"

echo "Building Docker image: ${DOCKER_USER}/${IMAGE_NAME}:${TAG}"

# Build the web app first
cd ../apps/web
echo "Installing web dependencies..."
npm install
echo "Building web app..."
npm run build

# Go back to services directory
cd ../services

# Build Docker image
echo "Building Docker image..."
docker build -f ../apps/web/Dockerfile.hub -t ${DOCKER_USER}/${IMAGE_NAME}:${TAG} ../apps/web

# Push to Docker Hub
echo "Pushing to Docker Hub..."
docker push ${DOCKER_USER}/${IMAGE_NAME}:${TAG}

echo ""
echo "Done! Use this image in docker-compose.yml:"
echo "  web:"
echo "    image: ${DOCKER_USER}/${IMAGE_NAME}:${TAG}"
echo ""
echo "Or pull and run:"
echo "  docker pull ${DOCKER_USER}/${IMAGE_NAME}:${TAG}"

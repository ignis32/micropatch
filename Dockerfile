FROM node:22
WORKDIR /app/microrack-snapshot
CMD ["npm", "run", "dev", "--", "--host"]
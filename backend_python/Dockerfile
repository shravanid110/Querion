FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed for building packages
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    git \
    curl \
    python3-setuptools \
    python3-dev \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install setuptools (pin < 70 to fix pkg_resources error) + wheel
RUN pip install --upgrade pip "setuptools<70" wheel

# Copy backend code
COPY . .

# Install Python dependencies
# We use --no-build-isolation to ensure openai-whisper uses the pinned setuptools
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

# Expose app port
EXPOSE 10000

# Start backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]
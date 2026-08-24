pipeline {
    agent any

    environment {
        IMAGE_NAME = "lear-maintenance-backend"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build Docker image') {
            steps {
                sh 'docker build -t $IMAGE_NAME:$BUILD_NUMBER .'
            }
        }

        stage('Tag latest') {
            steps {
                sh 'docker tag $IMAGE_NAME:$BUILD_NUMBER $IMAGE_NAME:latest'
            }
        }
    }

    post {
        success {
            echo 'Build réussi ✅'
        }
        failure {
            echo 'Build échoué ❌'
        }
    }
}
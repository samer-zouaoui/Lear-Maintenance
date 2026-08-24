pipeline {
    agent any

    environment {
        IMAGE_NAME = "lear-maintenance-backend"
        SONAR_PROJECT_KEY = "lear_maintenance"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Debug workspace') {
    steps {
        sh 'pwd && ls -la && find . -name "*.js" -not -path "*/node_modules/*" | wc -l'
    }
}

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    script {
                        // Utilise le nom d'outil configuré dans Jenkins Tools
                        def scannerHome = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                            -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                            -Dsonar.sources=.
                        """
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 1, unit: 'HOURS') {
                    waitForQualityGate abortPipeline: true
                }
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
node {
  stage('SCM') {
    checkout scm
  }
  stage('SonarQube Analysis') {
    def scannerHome = tool 'SonarScanner';
    withSonarQubeEnv() {
      sh "${scannerHome}/bin/sonar-scanner"
    }
  }
}
dependencyCheck {
  analyzers {
    // Other configuration settings
  }
  nvdApiKey = '659255fe-a05e-4c58-9fb4-5865458d2453'
}

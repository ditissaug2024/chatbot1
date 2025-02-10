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
  nvdApiKey = 'a73a4f05-9ac1-4352-b078-2c589f713ce0'
}

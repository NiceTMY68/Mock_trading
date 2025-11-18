# GitHub Actions Workflows

This directory contains CI/CD workflows for the Mock Trading Backend project.

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Steps:**
1. Checkout code
2. Setup JDK 17
3. Cache Maven dependencies
4. Build project (`mvn compile`)
5. Run all tests including Testcontainers integration tests
6. Upload test results as artifacts
7. Generate test summary

**Features:**
- ✅ Runs on Ubuntu latest
- ✅ Uses Testcontainers with Docker-in-Docker
- ✅ Caches Maven dependencies for faster builds
- ✅ Uploads test reports (retained for 7 days)
- ✅ Always runs test report generation (even if tests fail)

**Requirements:**
- Docker is pre-installed on GitHub Actions Ubuntu runners
- Testcontainers automatically works with Docker-in-Docker

### 2. PR Check Workflow (`pr-check.yml`)

**Triggers:**
- Pull request opened, synchronized, or reopened

**Steps:**
1. Checkout code
2. Setup JDK 17
3. Compile project
4. Run unit tests only (skip integration tests for faster feedback)
5. Comment PR with results

**Features:**
- ✅ Fast feedback (unit tests only)
- ✅ Automatic PR comments
- ✅ Compilation verification
- ✅ No Docker required (skips integration tests)

## Running Locally

### Simulate CI Build

```bash
# Run full CI pipeline locally
./mvnw clean compile
./mvnw -B -DskipTests=false test
```

### Run Only Unit Tests (PR Check simulation)

```bash
./mvnw test -Dtest="*Test,!*IntegrationTest"
```

### Run Only Integration Tests

```bash
# Requires Docker Desktop running
./mvnw test -Dtest="*IntegrationTest"
```

## Test Reports

Test results are uploaded as artifacts after each CI run:
- Go to Actions tab → Select workflow run → Download "test-results" artifact
- Contains Surefire XML and TXT reports

## Workflow Status

View workflow status at:
```
https://github.com/YOUR_USERNAME/YOUR_REPO/actions
```

## Adding New Workflows

To add a new workflow:
1. Create a new `.yml` file in `.github/workflows/`
2. Define triggers, jobs, and steps
3. Test locally if possible
4. Push to trigger the workflow

## Troubleshooting

### Testcontainers Fails in CI

**Issue:** Docker not available or permission errors

**Solution:**
- GitHub Actions runners have Docker pre-installed
- Testcontainers uses Ryuk for cleanup (automatic)
- No additional configuration needed

### Tests Timeout

**Issue:** Integration tests take too long

**Solution:**
- Increase timeout in workflow (default: 360 minutes)
- Optimize test startup time
- Consider parallel test execution

### Maven Cache Not Working

**Issue:** Dependencies download every time

**Solution:**
- Check cache key in workflow
- Verify `pom.xml` hasn't changed significantly
- Clear cache if corrupted (Settings → Actions → Caches)

## Best Practices

1. **Fast Feedback:** PR checks run unit tests only
2. **Full Validation:** Main CI runs all tests including integration
3. **Caching:** Maven dependencies cached for faster builds
4. **Artifacts:** Test reports retained for debugging
5. **Branch Protection:** Require CI to pass before merging

## Environment Variables

Workflows use these environment variables:
- `SPRING_PROFILES_ACTIVE=test` - Use test profile
- Maven flags: `-B` (batch mode), `-DskipTests=false` (run tests)

## Next Steps

- [ ] Configure branch protection rules
- [ ] Add code coverage reporting (Codecov/Coveralls)
- [ ] Add security scanning (Dependabot/Snyk)
- [ ] Add deployment workflows for staging/production


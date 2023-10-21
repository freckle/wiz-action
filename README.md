# Wiz Action

This action roughly implements [this configuration][docs] to scan docker images
with the Wiz CLI.

[docs]: https://docs.wiz.io/wiz-docs/docs/github-pipeline#image-scan

## Usage

```yaml
- run: docker build --tag myimage .
- uses: freckle/wiz-action@v1
  with:
    wiz-client-id: ${{ secrets.WIZ_CLIENT_ID }}
    wiz-client-secret: ${{ secrets.WIZ_CLIENT_SECRET }}
    image: myimage
```

## Usage with Buildx Action

```yaml
- id: build
  uses: docker/build-push-action@v5
  with:
    tags: ${{ steps.meta.outputs.tags }}
    load: true # required so we can scan it

- uses: freckle/wiz-action@v1
  with:
    wiz-client-id: ${{ secrets.WIZ_CLIENT_ID }}
    wiz-client-secret: ${{ secrets.WIZ_CLIENT_SECRET }}
    image: ${{ steps.build.outputs.imageid }}
    custom-policies: tvm_automation_policy
```

## Inputs and Outputs

### Inputs

**Required**:

- `wiz-client-id`: Wiz [Service Account] Client Id
- `wiz-client-secret`: Wiz [Service Account] Client Secret
- `image`: The image to scan

[service account]: https://docs.wiz.io/wiz-docs/docs/set-up-wiz-cli#generate-a-wiz-service-account-key

**Optional**:

- `custom-policies`: Custom policies to use (comma-separated).
- `fail`: Fail the job if the image violates policy? Default is `true`. Note
  that scan _errors_ will fail the job regardless of this setting.
- `pull`: Run `docker pull <image>` before scanning? Default is `false`.

### Outputs

- `scan-id`: the Id of the Scan Result report.
- `scan-result`: the outcome of the scan, one of `passed`, `failed`, or `error`.

See [action.yml](./action.yml) for a complete list of inputs and outputs.

## Versioning

Versioned tags will exist, such as `v1.0.0` and `v2.1.1`. Branches will exist
for each major version, such as `v1` or `v2` and contain the newest version in
that series.

### Release Process

Given a latest version of v1.0.1,

Is this a new major version?

If yes,

```console
git checkout main
git pull
git checkout -b v2
git tag -s -m v2.0.0 v2.0.0
git push --follow-tags
```

Otherwise,

```console
git checkout main
git pull
git checkout v1
git merge --ff-only -
git tag -s -m v1.0.2 v1.0.2    # or v1.1.0
git push --follow-tags
```

---

[LICENSE](./LICENSE)

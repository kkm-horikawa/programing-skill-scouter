import { describe, expect, it } from 'vitest';
import { detectTool } from './tooling-detect';

describe('detectTool', () => {
  it('root ファイル名からツールを拾う（ユーザーが挙げた系）', () => {
    expect(detectTool('justfile', 'file')).toBe('just');
    expect(detectTool('lefthook.yml', 'file')).toBe('lefthook');
    expect(detectTool('docker-compose.yml', 'file')).toBe('Docker Compose');
  });

  it('知見の薄い領域も横断で拾う（Rust/Go/.NET/Elixir 等）', () => {
    expect(detectTool('clippy.toml', 'file')).toBe('Clippy');
    expect(detectTool('rust-toolchain.toml', 'file')).toBe('Rust toolchain');
    expect(detectTool('.golangci.yml', 'file')).toBe('golangci-lint');
    expect(detectTool('mix.exs', 'file')).toBe('Elixir/Mix');
    expect(detectTool('global.json', 'file')).toBe('.NET');
  });

  it('拡張子からも拾う（Terraform/.NET/Jupyter/Packer）', () => {
    expect(detectTool('main.tf', 'file')).toBe('Terraform');
    expect(detectTool('App.csproj', 'file')).toBe('.NET');
    expect(detectTool('analysis.ipynb', 'file')).toBe('Jupyter');
    expect(detectTool('image.pkr.hcl', 'file')).toBe('Packer');
  });

  it('ディレクトリ名から拾う（terraform/k8s/helm/.husky）', () => {
    expect(detectTool('terraform', 'dir')).toBe('Terraform');
    expect(detectTool('k8s', 'dir')).toBe('Kubernetes');
    expect(detectTool('.husky', 'dir')).toBe('husky');
  });

  it('該当しなければ null。ファイル名のディレクトリ扱いは混同しない', () => {
    expect(detectTool('README.md', 'file')).toBeNull();
    expect(detectTool('src', 'dir')).toBeNull();
    // justfile はファイル。dir 扱いでは拾わない
    expect(detectTool('justfile', 'dir')).toBeNull();
  });

  it('大文字小文字を無視する', () => {
    expect(detectTool('Justfile', 'file')).toBe('just');
    expect(detectTool('Dockerfile.tf', 'file')).toBe('Terraform');
  });
});

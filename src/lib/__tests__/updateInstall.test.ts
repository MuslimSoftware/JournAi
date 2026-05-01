import { describe, expect, it } from 'vitest';
import {
  LINUX_APPIMAGE_DOWNLOAD_URL,
  LINUX_DEB_DOWNLOAD_URL,
  LINUX_RELEASES_URL,
  resolveUpdateInstallAction,
  type UpdateInstallationInfo,
} from '../updateInstall';

const baseInfo: UpdateInstallationInfo = {
  platform: 'other',
  bundleType: 'unknown',
  updaterTarget: null,
  appImageCanSelfUpdate: true,
  appImagePath: null,
  appImageUpdateIssue: null,
};

describe('resolveUpdateInstallAction', () => {
  it('uses the native installer for non-Linux installs', () => {
    expect(resolveUpdateInstallAction(baseInfo, '0.2.0')).toEqual({
      kind: 'install',
      label: 'Download & Install',
      url: null,
      notice: null,
    });
  });

  it('uses the native installer for writable AppImages', () => {
    expect(
      resolveUpdateInstallAction({
        ...baseInfo,
        platform: 'linux',
        bundleType: 'appimage',
      })
    ).toEqual({
      kind: 'install',
      label: 'Download & Install',
      url: null,
      notice: null,
    });
  });

  it('downloads the latest AppImage when the running AppImage is not writable', () => {
    const action = resolveUpdateInstallAction(
      {
        ...baseInfo,
        platform: 'linux',
        bundleType: 'appimage',
        appImageCanSelfUpdate: false,
        appImageUpdateIssue: 'The AppImage directory is not writable.',
      },
      '0.2.0'
    );

    expect(action.kind).toBe('external-download');
    if (action.kind !== 'external-download') throw new Error('expected external download action');
    expect(action.label).toBe('Download AppImage');
    expect(action.url).toBe(LINUX_APPIMAGE_DOWNLOAD_URL);
    expect(action.notice).toContain('replace the current AppImage manually');
  });

  it('downloads the latest Deb for Deb installs', () => {
    const action = resolveUpdateInstallAction(
      {
        ...baseInfo,
        platform: 'linux',
        bundleType: 'deb',
      },
      '0.2.0'
    );

    expect(action.kind).toBe('external-download');
    if (action.kind !== 'external-download') throw new Error('expected external download action');
    expect(action.label).toBe('Download Deb');
    expect(action.url).toBe(LINUX_DEB_DOWNLOAD_URL);
    expect(action.notice).toContain('system package installer');
  });

  it('opens the release page for unsupported Linux install types', () => {
    const action = resolveUpdateInstallAction({
      ...baseInfo,
      platform: 'linux',
      bundleType: 'unknown',
    });

    expect(action.kind).toBe('external-download');
    if (action.kind !== 'external-download') throw new Error('expected external download action');
    expect(action.label).toBe('Open Release Page');
    expect(action.url).toBe(LINUX_RELEASES_URL);
  });
});

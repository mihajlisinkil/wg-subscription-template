import { useState, memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ScanQrCode, Download } from 'lucide-react';
import { toast } from 'sonner';
import { parseLinks, type ParsedLink } from '@/lib/linkParser';
import { downloadTextFile, getWireGuardDownloadPayload } from '@/lib/subscriptionConfig';
import { QRModal } from '@/components/qr-modal';
import { useDir } from '@/hooks/useDir';
import { cn } from '@/lib/utils';

interface ConnectionLinksProps {
  links: string[];
}

type DownloadPayload = {
  content: string;
  fileName: string;
};

type ConfigRow = {
  link: ParsedLink;
  download: DownloadPayload | null;
};

// Browsers throttle (or silently drop) a burst of downloads fired in the same
// tick, so the "download all" loop spaces them out.
const DOWNLOAD_GAP_MS = 400;

export const ConnectionLinks = memo(({ links }: ConnectionLinksProps) => {
  const { t } = useTranslation();
  const dir = useDir();
  const [selectedLink, setSelectedLink] = useState<ParsedLink | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [downloadAllSuccess, setDownloadAllSuccess] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const downloadAllTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (downloadAllTimeoutRef.current) {
        clearTimeout(downloadAllTimeoutRef.current);
        downloadAllTimeoutRef.current = null;
      }
    };
  }, []);

  // Parse the links and resolve their WireGuard payload once, instead of
  // re-parsing every link on every render.
  const rows = useMemo<ConfigRow[]>(
    () =>
      parseLinks(links).map(link => ({
        link,
        download: getWireGuardDownloadPayload(link.raw),
      })),
    [links]
  );

  const downloadableRows = useMemo(
    () => rows.filter((row): row is ConfigRow & { download: DownloadPayload } => Boolean(row.download)),
    [rows]
  );

  const getProtocolBadge = useCallback((protocol: ParsedLink['protocol']) => {
    if (protocol === 'unknown') return 'SUB';
    if (protocol === 'shadowsocks') return 'SS';
    if (protocol === 'wireguard') return 'WG';
    if (protocol === 'hysteria') return 'HY2';
    return protocol;
  }, []);

  const handleDownload = useCallback((row: ConfigRow) => {
    try {
      if (!row.download) {
        throw new Error('WireGuard config not available');
      }

      downloadTextFile(row.download.content, row.download.fileName);
      toast.success(t('configActions.downloadStarted'));
    } catch (error) {
      console.error('Failed to download WireGuard config:', error);
      toast.error(t('configActions.downloadFailed'));
    }
  }, [t]);

  const handleDownloadAll = useCallback(async () => {
    if (isDownloadingAll || downloadableRows.length === 0) {
      return;
    }

    if (downloadAllTimeoutRef.current) {
      clearTimeout(downloadAllTimeoutRef.current);
      downloadAllTimeoutRef.current = null;
    }

    setIsDownloadingAll(true);

    // Two configs can carry the same remark, which would make the browser
    // overwrite the earlier file. Keep every file name unique.
    const usedNames = new Map<string, number>();
    let failed = 0;

    for (let index = 0; index < downloadableRows.length; index += 1) {
      const payload = downloadableRows[index].download;
      const seen = usedNames.get(payload.fileName) ?? 0;
      usedNames.set(payload.fileName, seen + 1);

      const fileName = seen === 0
        ? payload.fileName
        : `${payload.fileName.replace(/\.conf$/i, '')}-${seen + 1}.conf`;

      try {
        downloadTextFile(payload.content, fileName);
      } catch (error) {
        console.error('Failed to download WireGuard config:', error);
        failed += 1;
      }

      if (index < downloadableRows.length - 1) {
        await new Promise(resolve => {
          window.setTimeout(resolve, DOWNLOAD_GAP_MS);
        });
      }
    }

    if (!isMountedRef.current) {
      return;
    }

    setIsDownloadingAll(false);

    if (failed === downloadableRows.length) {
      toast.error(t('configActions.downloadFailed'));
      return;
    }

    setDownloadAllSuccess(true);
    toast.success(t('config.downloadAllStarted'));

    downloadAllTimeoutRef.current = window.setTimeout(() => {
      if (isMountedRef.current) {
        setDownloadAllSuccess(false);
      }
    }, 2000);
  }, [downloadableRows, isDownloadingAll, t]);

  const handleShowQR = useCallback((link: ParsedLink) => {
    setSelectedLink(link);
    setQrModalOpen(true);
  }, []);

  return (
    <div className="space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between gap-3">
        <h2 className="page-section-title flex items-center gap-2">
          <span className="text-xl">🔗</span>
          {t('config.downloadTitle')}
        </h2>

        {downloadableRows.length > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={isDownloadingAll}
            className="group flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow-primary/25 transition-all duration-200 hover:scale-105 hover:bg-primary/90 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            title={downloadAllSuccess ? t('config.downloadAllStarted') : t('config.downloadAll')}
          >
            {downloadAllSuccess ? (
              <Check className="h-4 w-4 animate-pulse transition-transform duration-200" />
            ) : (
              <Download className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
            )}
            <span className="transition-all duration-200">
              {downloadAllSuccess ? t('config.downloadAllStarted') : t('config.downloadAll')}
            </span>
          </button>
        )}
      </div>

      <div className="max-h-[400px] space-y-2 overflow-y-auto">
        {rows.map((row, index) => (
          <div
            key={index}
            className="group relative rounded-lg border bg-card p-3 transition-all duration-200 hover:border-primary/50"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              {/* Config identity */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="page-badge shrink-0 rounded bg-primary px-2 py-0.5 text-primary-foreground">
                  {getProtocolBadge(row.link.protocol)}
                </div>

                {row.link.emoji && <span className="text-sm">{row.link.emoji}</span>}

                <div
                  dir="ltr"
                  className={cn(
                    'page-item-title min-w-0 flex-1 truncate',
                    dir === 'rtl' ? 'text-right' : 'text-left'
                  )}
                >
                  {row.link.name}
                </div>
              </div>

              {/* Actions */}
              <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
                {row.download && (
                  <button
                    onClick={() => handleDownload(row)}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 sm:flex-none"
                    title={t('configActions.downloadConfig')}
                  >
                    <Download className="h-3.5 w-3.5 shrink-0" />
                    <span>{t('configActions.downloadConfig')}</span>
                  </button>
                )}

                <button
                  onClick={() => handleShowQR(row.link)}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm font-medium transition-all hover:bg-secondary sm:flex-none"
                  title={t('qr.show')}
                >
                  <ScanQrCode className="h-3.5 w-3.5 shrink-0" />
                  <span>{t('qr.show')}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Keep the dialog mounted after close so Radix can play exit animations */}
      {selectedLink && (
        <QRModal
          link={selectedLink}
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
        />
      )}
    </div>
  );
});

ConnectionLinks.displayName = 'ConnectionLinks';

# CloudMarkdown

![](https://github.com/shosatojp/cloudmd-back/workflows/Node%20CI/badge.svg)

- ユーザー管理はしない(めんどい)
- 不特定多数利用可能
    - yamlheaderは必須とする
- 単一ファイルドラッグアンドドロップでできるように
- WebSocketで進行状況をリアルタイムで配信
- ダウンロード可能になったらリンク表示
- PDFは静的ファイルとして適当なディレクトリに出力
- 一意なIDを振りそれをリンクとする
- 出力PDFは5分くらいで削除
- バックはDocker内
- いいかんじのUI(てきとう)
- latexのinclude、command機能セキュリティ
- Pandoc Filter with Python
- Download Endpoint
    - force download header
    - https://mamewaza.com/support/blog/force-download.html
- Firefox でダウンロードできなかった
- まだWebSocket切れる

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method not allowed" });

    const { pin, content } = req.body || {};
    const ADMIN_PIN = process.env.ADMIN_PIN;

    if (!ADMIN_PIN) return res.status(500).json({ ok:false, error:"Server missing ADMIN_PIN" });
    if (!pin || String(pin) !== String(ADMIN_PIN)) return res.status(401).json({ ok:false, error:"Bad PIN" });

    if (!content || typeof content !== "object") {
      return res.status(400).json({ ok:false, error:"Missing content payload" });
    }

    // ---- GitHub env ----
    const token  = process.env.GITHUB_TOKEN;
    const owner  = process.env.GITHUB_OWNER;
    const repo   = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";

    if (!token || !owner || !repo) {
      return res.status(500).json({ ok:false, error:"Server missing GitHub env vars" });
    }

    // 1) Get latest commit + tree for branch
    const api = "https://api.github.com";
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "lodge-publisher"
    };

    const refResp = await fetch(`${api}/repos/${owner}/${repo}/git/ref/heads/${branch}`, { headers });
    if (!refResp.ok) {
      const t = await refResp.text();
      return res.status(500).json({ ok:false, error:"Failed to read branch ref", detail:t });
    }
    const refData = await refResp.json();
    const latestCommitSha = refData.object.sha;

    const commitResp = await fetch(`${api}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
    if (!commitResp.ok) {
      const t = await commitResp.text();
      return res.status(500).json({ ok:false, error:"Failed to read commit", detail:t });
    }
    const commitData = await commitResp.json();
    const baseTreeSha = commitData.tree.sha;

    // 2) Create blob for data/content.json
    const contentJson = JSON.stringify(content, null, 2);
    const blobResp = await fetch(`${api}/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: contentJson, encoding: "utf-8" })
    });
    if (!blobResp.ok) {
      const t = await blobResp.text();
      return res.status(500).json({ ok:false, error:"Failed to create blob", detail:t });
    }
    const blobData = await blobResp.json();

    // 3) Create new tree with updated content.json
    const treeResp = await fetch(`${api}/repos/${owner}/${repo}/git/trees`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [
          { path: "data/content.json", mode: "100644", type: "blob", sha: blobData.sha }
        ]
      })
    });
    if (!treeResp.ok) {
      const t = await treeResp.text();
      return res.status(500).json({ ok:false, error:"Failed to create tree", detail:t });
    }
    const treeData = await treeResp.json();

    // 4) Create commit
    const msg = `publish: update content.json (${new Date().toISOString()})`;
    const newCommitResp = await fetch(`${api}/repos/${owner}/${repo}/git/commits`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: msg,
        tree: treeData.sha,
        parents: [latestCommitSha]
      })
    });
    if (!newCommitResp.ok) {
      const t = await newCommitResp.text();
      return res.status(500).json({ ok:false, error:"Failed to create commit", detail:t });
    }
    const newCommitData = await newCommitResp.json();

    // 5) Move branch ref to new commit
    const updResp = await fetch(`${api}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ sha: newCommitData.sha, force: false })
    });
    if (!updResp.ok) {
      const t = await updResp.text();
      return res.status(500).json({ ok:false, error:"Failed to update branch ref", detail:t });
    }

    return res.status(200).json({ ok:true, commit: newCommitData.sha });
  } catch (e) {
    return res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
}

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import emailjs from "emailjs-com";
import "./sidebar.css";

function MyMedicalRecords({ walletAddress }) {
  const [showForm, setShowForm] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [assetType, setAssetType] = useState("FILE");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [assets, setAssets] = useState([]);

  // Email states
  const [userEmail, setUserEmail] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Load saved assets on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("digitalAssets") || "[]");
    setAssets(saved);
  }, []);

  const handleToggleForm = () => {
    setShowForm(!showForm);
    setMessage("");
  };

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
  };

  const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteAsset = (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      const updatedAssets = assets.filter((a) => a.id !== id);
      setAssets(updatedAssets);
      localStorage.setItem("digitalAssets", JSON.stringify(updatedAssets));
    }
  };

  // ✅ EMAILJS integration
  const handleEmailRequest = (e) => {
    e.preventDefault();

    if (!userEmail || !doctorEmail) {
      alert("Please enter both your email and the doctor's email.");
      return;
    }

    const templateParams = {
      user_email: userEmail,
      doctor_email: doctorEmail,
      message: `
        <div style="font-family: system-ui, sans-serif, Arial; font-size: 12px">
          <div>Please share my medical reports.</div>
          <div style="margin-top: 20px; padding: 15px 0; border-width: 1px 0; border-style: dashed; border-color: lightgrey;">
          </div>
          <p>Patient email: ${userEmail}</p>
        </div>
      `,
    };

    emailjs
      .send(
        "service_shrvd3h", // ✅ Your service ID
        "template_stfzz9o", // ✅ Your template ID
        templateParams,
        "nRjLRxswh-7jL-7Gt" // ✅ Your public key
      )
      .then(
        (response) => {
          console.log("SUCCESS!", response.status, response.text);
          alert("Request email sent to doctor successfully!");
          setUserEmail("");
          setDoctorEmail("");
        },
        (error) => {
          console.error("FAILED...", error);
          alert("Failed to send the email. Please try again.");
        }
      );
  };

  const handleSaveAsset = async (e) => {
    e.preventDefault();

    if (!walletAddress) {
      setMessage("Connect or create a wallet to save assets.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const fileData = await readFileAsDataUrl(file);

      const asset = {
        id: Date.now(),
        name: assetName,
        description,
        quantity: Number(quantity),
        type: assetType,
        fileName: file ? file.name : null,
        fileData,
        createdAt: new Date().toISOString(),
      };

      const existing = JSON.parse(localStorage.getItem("digitalAssets") || "[]");
      existing.push(asset);
      localStorage.setItem("digitalAssets", JSON.stringify(existing));
      setAssets(existing);

      setMessage("Asset saved successfully!");
      setAssetName("");
      setDescription("");
      setQuantity(1);
      setAssetType("FILE");
      setFile(null);
      setShowForm(false);
    } catch (err) {
      console.error("Failed to save asset:", err);
      setMessage("Failed to save asset.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>My Medical Records</h1>
      <p style={{ marginTop: '70px' }}>View and manage your Electronic Medical Records.</p>
      <div className="btnbox" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '-90px' }}>
        <button 
          className="addnew btn" 
          onClick={handleToggleForm}
          style={{ 
            padding: '5px 10px', 
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <img
                src="/add.png"
                alt="Add"
                style={{ width: "16px", height: "16px", marginRight: "8px" }}
              />
              Add New Record
            </>
          )}
        </button>

        <button
          className="btn2"
          onClick={() => alert("Share feature coming soon!")}
          style={{ 
            padding: '5px 10px', 
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src="/share.png"
            alt="Share"
            style={{ width: "16px", height: "16px", marginRight: "8px" }}
          />
          Share Records
        </button>

        <button
          className="btn2"
          onClick={() => setShowEmailForm((s) => !s)}
          style={{ 
            padding: '5px 10px', 
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src="/mail.png"
            alt="Request"
            style={{ width: "18px", height: "16px", marginRight: "8px" }}
          />
          Request Records
        </button>
      </div>

      {/* ✅ Email Request Form */}
      {showEmailForm && (
      <div className="email-request-box" style={{ marginTop: 25 }}>
         <h3>Request Medical Records</h3>
         <form onSubmit={handleEmailRequest}>
           <input
             type="email"
             placeholder="Your Email"
             value={userEmail}
             onChange={(e) => setUserEmail(e.target.value)}
             required
             className="input"
             style={{ marginRight: "10px", width: "250px", padding: "8px" }}
           />
           <input
             type="email"
             placeholder="Doctor's Email"
             value={doctorEmail}
             onChange={(e) => setDoctorEmail(e.target.value)}
             required
             className="input"
             style={{ marginRight: "10px", width: "250px", padding: "8px" }}
           />
           <button 
             type="submit" 
             className="btn2"
             style={{ 
               padding: '10px 20px', 
               fontSize: '14px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               marginTop: '10px'
             }}
           >
             <img
               src="/mail.png"
               alt="Request"
               style={{ width: "18px", height: "16px", marginRight: "8px" }}
             />
             Send Request
           </button>
         </form>
       </div>
      )}

      {/* ✅ Add / View Records Section */}
      {showForm ? (
        <div className="wallet-card" style={{ marginTop: 20 }}>
          <div className="asset-form" style={{ marginTop: 0 }}>
            <h2>Add a New Digital Asset</h2>

            {!walletAddress && (
              <div
                className="connected"
                style={{ marginBottom: 12, color: "#ff0000" }}
              >
                Wallet not connected.{" "}
                <Link to="/yourwallet">Create</Link> or{" "}
                <Link to="/recover">Recover</Link> a wallet to save assets.
              </div>
            )}
          </div>

          <form onSubmit={handleSaveAsset}>
            <div className="div1">
              <label>Asset Name</label>
              <br />
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                required
                className="input"
                style={{ padding: "8px", width: "100%" }}
              />
            </div>

            <div className="div2">
              <label>Asset type</label>
              <br />
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="input"
                style={{ padding: "8px", width: "100%" }}
              >
                <option value="FILE">FILE</option>
                <option value="NFT">NFT</option>
              </select>
            </div>

            <div className="div3">
              <label>Description</label>
              <br />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                rows={3}
                style={{ padding: "8px", width: "100%" }}
              />
            </div>

            <div className="div4">
              <label>Quantity</label>
              <br />
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="input"
                style={{ padding: "8px", width: "100%" }}
              />
            </div>

            <div className="div5">
              <label>Asset file / Image</label>
              <br />
              <input type="file" onChange={handleFileChange} style={{ padding: "8px", width: "100%" }} />
              {file && (
                <div style={{ marginTop: 6 }}>Selected: {file.name}</div>
              )}
            </div>

            <div className="div6">
              <button
                type="submit"
                className="btn"
                disabled={saving || !walletAddress}
                style={{ 
                  padding: '10px 20px', 
                  fontSize: '14px',
                  marginTop: '15px'
                }}
              >
                {saving ? "Saving..." : "Save Asset"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="wallet-card" style={{ marginTop: 20 }}>
          <h4>Records</h4>
          {assets.length === 0 ? (
            <p>Click "Add New Record" to upload your first EMR.</p>
          ) : (
            <ul className="asset-list">
              {assets.map((asset) => (
                <li
                  key={asset.id}
                  className="asset-item"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid #eee"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{asset.name}</div>
                    <div style={{ fontSize: 13, color: "#555" }}>
                      {asset.description || "No description"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#777",
                        marginTop: 6,
                      }}
                    >
                      Type: {asset.type} • Qty: {asset.quantity} •{" "}
                      {new Date(asset.createdAt).toLocaleString()}
                    </div>
                    {asset.fileName && asset.fileData && (
                      <div style={{ marginTop: 6 }}>
                        <a
                          href={asset.fileData}
                          download={asset.fileName}
                          className="btn-sm"
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '12px'
                          }}
                        >
                          Download
                        </a>
                      </div>
                    )}
                  </div>

                  <div>
                    <button
                      className="btn"
                      style={{
                        background: "#d9534f",
                        borderColor: "#d43f3a",
                        padding: '6px 12px', 
                        fontSize: '12px'
                      }}
                      onClick={() => handleDeleteAsset(asset.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {message && <div style={{ marginTop: 12 }}>{message}</div>}
    </div>
  );
}

export default MyMedicalRecords;
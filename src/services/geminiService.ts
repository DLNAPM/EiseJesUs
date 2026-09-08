import { Inquiry, LiteraryWorkExport } from "../types";

export async function generateScholarTTS(
  text: string,
  personaName: string,
  gender: 'male' | 'female'
): Promise<string> {
  // Clean text from markdown formatting (*, #, _, `, etc.)
  const cleanText = text
    .replace(/\*+/g, '')
    .replace(/#+/g, '')
    .replace(/`+/g, '')
    .replace(/_+/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return "";

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanText, personaName, gender }),
    });

    if (res.ok) {
      const rawText = await res.text();
      if (rawText && rawText.trim()) {
        try {
          const data = JSON.parse(rawText);
          if (data && data.audioBase64) {
            return data.audioBase64;
          }
        } catch {
          // Non-JSON response
        }
      }
    }
  } catch (err) {
    console.warn("Server TTS API call failed, falling back to browser speech synthesis:", err);
  }

  return "";
}

function getClientSanctuaryFallback(userMessage: string): string {
  const promptLower = (userMessage || "").toLowerCase();

  if (promptLower.includes("matthew 16") || (promptLower.includes("rock") && (promptLower.includes("peter") || promptLower.includes("church")))) {
    return `### The Rock and the Unshakeable Church (Matthew 16:18)

Grace and peace to you, pilgrim. When Simon Peter uttered the divine confession, *"You are the Christ, the Son of the living God"* (**Matthew 16:16**), our Lord responded:

> *"And I tell you, you are Peter, and on this rock I will build my church, and the gates of hell shall not prevail against it."* (**Matthew 16:18**)

* **The Greek Wordplay (*Petros* vs. *Petra*):** Jesus addresses Simon as **Petros** (G4074), denoting an isolated stone or pebble, but declares that His church is built upon **petra** (G4073)—a massive, immovable bedrock cliff.
* **Patristic Witness:** St. Augustine (*Retractationes* 1.21.1) and St. John Chrysostom affirmed that this foundation rock is Christ Himself and the God-given revelation of His divine Sonship which Peter confessed. St. Paul corroborates this in **1 Corinthians 3:11**: *"For no other foundation can anyone lay than that which is laid, which is Jesus Christ."*
* **The Gates of Hades:** Spoken near the cliff grotto of Pan at Caesarea Philippi, the phrase declares that the forces of death and darkness can never overpower or undo the living assembly of God.
* **Pastoral Encouragement:** Anchor your soul today upon Christ the Rock. Earthly kingdoms falter, but His church and His covenant promises endure forever.`;
  }

  if (promptLower.includes("leviticus 21") || (promptLower.includes("aaron") && (promptLower.includes("defect") || promptLower.includes("blemish") || promptLower.includes("reject")))) {
    return `### Divine Holiness and Typology in Leviticus 21:16–24

Grace and peace to you, pilgrim. In **Leviticus 21:16–24**, the Lord commands that descendants of Aaron with physical defects (*mum*, H3971) shall not draw near (*nagash*) to present the food offerings at the altar.

* **Typological Symbolism:** The Old Covenant altar required visible perfection not as an assessment of personal moral worth, but as an earthly shadow representing the flawless moral holiness of God. The physical priest prefigured **Jesus Christ**, the true and spotless High Priest (**Hebrews 7:26; 1 Peter 1:19**).
* **Covenant Mercy & Inclusion:** Crucially, God explicitly commands in verse 22: *"He may eat the food of his God, both of the most holy and of the holy."* Aaron's descendants with blemishes were never cast out, impoverished, or dehumanized; they retained full priestly dignity, sustenance, and family inheritance.
* **Fulfillment in Christ:** Under the New Covenant, Jesus actively embraced and healed those with physical infirmities, making all who believe into a "royal priesthood" (**1 Peter 2:9**). In Him, our infirmities become vessels for divine strength (**2 Corinthians 12:9**).`;
  }

  if (promptLower.includes("melchizedek") || promptLower.includes("hebrew") || promptLower.includes("priest")) {
    return `### Melchizedek: The Eternal Priest-King

Grace and peace to you, pilgrim. **Melchizedek** appears in **Genesis 14:18–20** as the King of Salem and "Priest of God Most High" (*El Elyon*), presenting bread and wine and blessing Abraham.

In **Psalm 110:4** and **Hebrews 7**, Melchizedek is unveiled as the supreme biblical type of the eternal priesthood of our Lord Jesus Christ. Unlike the Levitical priests descended from Aaron who were hindered by death, Christ is consecrated High Priest forever by divine oath, possessing an **indestructible life** (**Hebrews 7:16, 24–25**).

* **Historical & Patristic Witness:** St. Augustine observed that the bread and wine of Melchizedek foreshadowed the sacramental communion of Christ, while John Calvin noted that scripture's silence regarding Melchizedek's genealogy prefigures the eternal divinity of the Son of God.
* **Pastoral Application:** Rest in the absolute security of having a Great High Priest who lives forever to make intercession for you before the Father.`;
  }

  if (promptLower.includes("cross") || promptLower.includes("deny") || promptLower.includes("follow") || promptLower.includes("disciple")) {
    return `### The Call to Discipleship: Taking Up Your Cross

Grace and peace to you, pilgrim. When Jesus declared, *"If anyone would come after me, let him deny himself and take up his cross daily and follow me"* (**Luke 9:23**), He spoke to the heart of Christian discipleship.

* **Historical Weight:** In first-century Judea, bearing a cross was not a mere metaphor; it was the visible mark of a condemned soul surrendered completely to sovereign authority.
* **Theological Meaning:** To "deny oneself" (*aparneomai*, G533) means dethroning self-will and enthroning Christ as Lord. St. Paul echoes this in **Galatians 2:20**: *"I have been crucified with Christ. It is no longer I who live, but Christ who lives in me."*
* **The Daily Resurrection:** Dietrich Bonhoeffer observed that "when Christ calls a man, he bids him come and die"—yet this death to self yields the fullness of indestructible spiritual life and joy in the Holy Spirit.`;
  }

  if (promptLower.includes("grace") || promptLower.includes("faith") || promptLower.includes("justif") || promptLower.includes("saved")) {
    return `### Sola Gratia: Justification by Faith in Christ

Grace and peace to you, pilgrim. The central heartbeat of apostolic theology is captured in **Ephesians 2:8–9**: *"For by grace you have been saved through faith. And this is not your own doing; it is the gift of God, not a result of works, so that no one may boast."*

* **Biblical Lexicon:** Grace (*charis*, G5485) represents the unmerited, lavish favor of God toward unworthy sinners. Faith (*pistis*, G4102) is the empty hand that clings to Christ's finished work on the cross.
* **Classical Consensus:** St. Augustine contended vigorously against Pelagianism, demonstrating that even our desire to seek God originates in sovereign grace. Martin Luther called justification by faith the article by which the church stands or falls.
* **Living Fruit:** True faith is never sterile; as **Ephesians 2:10** and **James 2** attest, saving faith overflows in genuine works of love, justice, and mercy.`;
  }

  return `### Scriptural Reflections on: "${userMessage}"

Grace and peace to you, pilgrim. I have received your question: **"${userMessage}"**.

1. **The Biblical Witness:** As the Psalmist proclaims, *"Your word is a lamp to my feet and a light to my path"* (**Psalm 119:105**), and the Apostle Paul assures us in **2 Timothy 3:16–17** that all Scripture is God-breathed and profitable for doctrine, reproof, correction, and training in righteousness.
2. **Patristic Wisdom:** Early Church Fathers like **St. Augustine** and **St. John Chrysostom** taught that whenever we bring our hearts and minds before Holy Scripture, we are met by the living God who desires to impart wisdom, peace, and spiritual fortitude.
3. **Pastoral Reflection:** Take comfort today that the Lord hears every seeking heart. Bring your study before Him in quiet prayer, and inquire further on any specific passage or verse as we walk this path of faith together.`;
}

export async function chatWithSanctuary(
  message: string, 
  history: { role: 'user' | 'model', text: string }[],
  recentInquiries: Inquiry[]
): Promise<string> {
  const sanitizedHistory = history
    .filter(h => {
      if (!h || !h.text) return false;
      const t = String(h.text);
      return (
        !t.includes("connection to the sanctuary was interrupted") && 
        !t.includes("experiencing high demand") &&
        !t.includes("Greetings, pilgrim") &&
        !t.includes("Sanctuary Scholar returned an empty response") &&
        !t.includes("Sanctuary Scholar communication error") &&
        !t.includes("Service temporarily unavailable") &&
        !t.startsWith("Forgive me") &&
        !t.startsWith("I'm sorry, I couldn't find an answer")
      );
    })
    .map(h => ({ role: h.role, text: h.text }));

  const doChatFetch = async (): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24000);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: sanitizedHistory,
          recentInquiries: recentInquiries || []
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const rawText = await res.text();
      let data: any = null;

      if (rawText && rawText.trim()) {
        try {
          data = JSON.parse(rawText);
        } catch {
          // Non-JSON response (e.g., HTML during server reload or proxy warm-up)
        }
      }

      if (res.ok && data && typeof data.text === "string" && data.text.trim()) {
        return data.text.trim();
      }

      if (!res.ok) {
        const serverMsg = data?.message || data?.error || (rawText && !rawText.trim().startsWith("<") ? rawText.slice(0, 150) : `Gateway status ${res.status}`);
        throw new Error(serverMsg);
      }

      throw new Error("Scholar gateway returned non-text payload");
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  try {
    return await doChatFetch();
  } catch (err: any) {
    console.warn("First Sanctuary Chat attempt encountered issue, retrying with backoff...", err?.message || err);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return await doChatFetch();
    } catch (retryErr: any) {
      console.warn("Sanctuary Scholar gateway fallback engaged:", retryErr?.message || retryErr);
      return getClientSanctuaryFallback(message);
    }
  }
}

export function getThematicImagesForTopic(sessionName: string, conversationText: string): { title: string; caption: string; imageUrl: string }[] {
  const text = (sessionName + " " + conversationText).toLowerCase();
  
  // 0. Judah, Joseph, Lion of Judah, Patriarchs, Genesis, Jacob, Egypt, Benjamin, Reconciliation, Brother
  if (text.includes("judah") || text.includes("joseph") || text.includes("lion") || text.includes("patriarch") || text.includes("genesis") || text.includes("jacob") || text.includes("benjamin") || text.includes("pharaoh") || text.includes("reconciliation") || text.includes("intercession") || text.includes("plea")) {
    return [
      {
        title: "Judah's Plea & Joseph's Reconciliation in Egypt",
        caption: `Sacred portrayal of Judah's sacrificial intercession before Joseph, embodying brotherly devotion, messianic lineage, and royal mercy in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "The Scepter of Judah & Patriarchal Covenant",
        caption: `Ancient illuminated manuscript depicting Jacob's blessing over the tribe of Judah and the promise of the royal scepter in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 1. Holy Communion, Last Supper, Eucharist, Bread and Wine, Covenant Table
  if (text.includes("communion") || text.includes("last supper") || text.includes("eucharist") || text.includes("bread") || text.includes("wine") || text.includes("chalice") || text.includes("body and blood") || text.includes("passover") || text.includes("table of the lord") || text.includes("covenant meal")) {
    return [
      {
        title: "The Covenant Table & Golden Wheat Harvest",
        caption: `Golden sheaves of grain representing the bread of life broken for humanity, reflecting the sacred communion theme of "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Illuminated Manuscripts of the New Covenant",
        caption: `Ancient sacred scriptures opened to the institution of the Lord's Supper, illuminating the theological depth of ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 2. Baptism, Holy Waters, Jordan River, Regeneration, Cleansing
  if (text.includes("baptis") || text.includes("jordan river") || text.includes("living water") || text.includes("cleansing") || text.includes("washing") || text.includes("fountain")) {
    return [
      {
        title: "Sacred Waters of the Jordan River",
        caption: `Serene flowing waters of the Jordan, commemorating the baptism of Jesus and the sacrament of spiritual rebirth in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Living Water & Divine Grace",
        caption: `Cascading crystal waters testifying to the washing of regeneration and eternal life promised in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 3. Beatitudes, Sermon on the Mount, Galilee Shoreline, Kingdom
  if (text.includes("beatitude") || text.includes("sermon on the mount") || text.includes("blessed are") || text.includes("salt and light") || text.includes("blessing")) {
    return [
      {
        title: "The Mount of Beatitudes & Galilean Shore",
        caption: `Lush hills overlooking the Sea of Galilee where Jesus delivered the Sermon on the Mount, central to "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Light of the World & Divine Wisdom",
        caption: `Morning sunbeams reflecting off Galilean waters, symbolizing the moral and spiritual kingdom teachings in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 4. Moses, Exodus, Law, Sinai, Tabernacle, Torah, Decalogue
  if (text.includes("moses") || text.includes("exodus") || text.includes("commandment") || text.includes("sinai") || text.includes("red sea") || text.includes("egypt") || text.includes("tabernacle") || text.includes("torah") || text.includes("ark of the covenant") || text.includes("wilderness")) {
    return [
      {
        title: "Wilderness of Sinai & Covenant Mountain",
        caption: `The rugged limestone peaks of Mount Sinai, where Moses received the Ten Commandments, supporting the study of "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Sacred Manuscripts of the Law",
        caption: `Illuminated ancient parchment scrolls containing the books of the Torah and Mosaic statutes in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 5. Paul, Epistles, Missionary Journeys, Romans, Corinthians, Galatians, Ephesians, Philippians, Colossians, Timothy
  if (text.includes("paul") || text.includes("epistle") || text.includes("roman") || text.includes("corinthian") || text.includes("galatian") || text.includes("ephesian") || text.includes("philippian") || text.includes("colossian") || text.includes("thessalonian") || text.includes("timothy") || text.includes("titus") || text.includes("missionary") || text.includes("damascus") || text.includes("apostle")) {
    return [
      {
        title: "Roman Roads & Missionary Journeys of Saint Paul",
        caption: `Ancient Roman stone highways and Mediterranean sea routes traversed by Saint Paul during his apostolic letters in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Apostolic Codex & Early Church Epistles",
        caption: `Classical papyrus epistolary scroll symbolizing the Pauline letters sent to early Christian assemblies in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 6. David, Psalms, Worship, Music, Harp, Solomon, Zion, Praise
  if (text.includes("david") || text.includes("psalm") || text.includes("harp") || text.includes("worship") || text.includes("sing") || text.includes("solomon") || text.includes("samuel") || text.includes("zion") || text.includes("praise") || text.includes("music")) {
    return [
      {
        title: "City of David & Historic Zion Citadel",
        caption: `Ancient stone citadel of Jerusalem, heart of the Davidic kingdom and royal psalmists in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Acoustic Praise & Lyrical Psalms",
        caption: `Stringed melodies and songs of devotion reflecting the poetic heart of the Book of Psalms in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 7. Armor of God, Spiritual Warfare, Fortress, Shield, Defense
  if (text.includes("armor of god") || text.includes("spiritual warfare") || text.includes("shield of faith") || text.includes("helmet of salvation") || text.includes("sword of the spirit") || text.includes("fortress") || text.includes("stronghold")) {
    return [
      {
        title: "Ancient Citadel & Shield of Faith",
        caption: `Unshakable stone fortress symbolizing the divine shield of faith and spiritual protection described in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "The Sword of the Spirit & Divine Truth",
        caption: `Radiant light on scripture parchment representing the sword of the Spirit, which is the word of God in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 8. Parables, Sower, Shepherd, Vineyard, Harvest, Prodigal, Samaritan
  if (text.includes("parable") || text.includes("sower") || text.includes("shepherd") || text.includes("vineyard") || text.includes("harvest") || text.includes("wheat") || text.includes("prodigal") || text.includes("samaritan") || text.includes("mustard") || text.includes("sheep")) {
    return [
      {
        title: "The Good Shepherd & Pastoral Judean Hills",
        caption: `Gentle pastoral landscapes of the Holy Land reflecting Jesus' parables of the Good Shepherd and lost sheep in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Golden Wheat Harvest & Parable Fields",
        caption: `Fertile agricultural fields representing the Sower, the mustard seed, and the Kingdom of Heaven in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 9. Cross, Crucifixion, Atonement, Passion, Grace, Salvation, Resurrection, Tomb
  if (text.includes("cross") || text.includes("passion") || text.includes("calvary") || text.includes("golgotha") || text.includes("crucifixion") || text.includes("atonement") || text.includes("grace") || text.includes("salvation") || text.includes("resurrection") || text.includes("tomb") || text.includes("easter")) {
    return [
      {
        title: "Mount Calvary & The Redeeming Cross",
        caption: `Solemn silhouette of the cross at sunset, commemorating the ultimate sacrifice and divine grace in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "The Empty Tomb & Resurrection Dawn",
        caption: `Radiant morning light breaking into an ancient stone tomb, witnessing Christ's victory over death in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1518081461904-9d8f136351c2?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 10. Holy Spirit, Pentecost, Flames, Dove, Renewal, Anointing
  if (text.includes("holy spirit") || text.includes("pentecost") || text.includes("tongues of fire") || text.includes("comforter") || text.includes("anointing") || text.includes("spirit")) {
    return [
      {
        title: "Heavenly Rays & Holy Spirit Presence",
        caption: `Divine beams of light breaking through dark clouds, illustrating the outpouring of the Holy Spirit in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Sanctuary Illumination & Spiritual Renewal",
        caption: `Warm candlelight and divine illumination testifying to spiritual transformation and comfort in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 11. Wisdom, Proverbs, Ecclesiastes, Job, Suffering, Trials, Patience
  if (text.includes("wisdom") || text.includes("proverb") || text.includes("ecclesiastes") || text.includes("job") || text.includes("suffering") || text.includes("trial") || text.includes("patience") || text.includes("understanding")) {
    return [
      {
        title: "Solomonic Wisdom & Illuminated Study",
        caption: `A quiet sanctuary of classical wisdom literature, pondering the fear of the Lord and understanding in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Quiet Reflection & Divine Sovereignty",
        caption: `Ancient olive groves providing peaceful solace for theological reflection on human trials in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 12. Prophets, Prophecy, Isaiah, Jeremiah, Ezekiel, Daniel, Revelation, Patmos
  if (text.includes("prophet") || text.includes("prophecy") || text.includes("isaiah") || text.includes("jeremiah") || text.includes("ezekiel") || text.includes("daniel") || text.includes("revelation") || text.includes("vision") || text.includes("patmos") || text.includes("end times")) {
    return [
      {
        title: "Prophetic Watchtower & Heavenly Vision",
        caption: `Solitary high peaks under dramatic skies, symbolizing the prophetic watchmen announcing messianic hope in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Scrolls of Revelation & Apocalyptic Light",
        caption: `Illuminated ancient codex containing prophetic apocalyptic visions and the New Jerusalem promise in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 13. Creation, Genesis, Adam, Eden, Noah, Ark, Cosmos, Nature
  if (text.includes("creation") || text.includes("genesis") || text.includes("adam") || text.includes("eden") || text.includes("noah") || text.includes("ark") || text.includes("flood") || text.includes("nature") || text.includes("stars") || text.includes("cosmos")) {
    return [
      {
        title: "The Heavens Declare Creation's Glory",
        caption: `The vast celestial expanse and star-filled cosmos celebrating Genesis creation in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Living Waters of Paradise",
        caption: `Pure cascading waters and lush flora symbolizing the pristine Garden of Eden and divine grace in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 14. Prayer, Fasting, Altar, Intercession, Devotion
  if (text.includes("prayer") || text.includes("fasting") || text.includes("sanctuary") || text.includes("altar") || text.includes("intercession") || text.includes("devotion")) {
    return [
      {
        title: "Sanctuary of Intercession & Prayer",
        caption: `Warm candlelight illuminating a quiet house of prayer during heartfelt communion with God in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Beam of Heavenly Light & Grace",
        caption: `Luminous light breaking through dark clouds, representing divine answer to prayer and steadfast faith in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 15. Jesus, Gospels, Disciples, Miracles, Savior, Christ
  if (text.includes("jesus") || text.includes("gospel") || text.includes("christ") || text.includes("galilee") || text.includes("disciples") || text.includes("miracle") || text.includes("savior")) {
    return [
      {
        title: "Sea of Galilee at Sunrise",
        caption: `Serene shoreline of Galilee where Jesus called His disciples and performed divine miracles, central to "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Dawn of the Resurrection",
        caption: `Radiant morning light entering an ancient stone sanctuary, testifying to Christ's gospel victory in ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1518081461904-9d8f136351c2?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // 16. Jerusalem, Temple, Holy Land, Israel, Gethsemane
  if (text.includes("jerusalem") || text.includes("temple") || text.includes("holy land") || text.includes("hebrew") || text.includes("israel") || text.includes("gethsemane")) {
    return [
      {
        title: "Historic Gates of Old Jerusalem",
        caption: `Ancient limestone arches and battlements of Jerusalem, city of prophets and messianic promises in "${sessionName}".`,
        imageUrl: "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Venerable Olive Grove of Gethsemane",
        caption: `Ancient olive trees standing in quiet meditation near Jerusalem, rooted in biblical history for ${sessionName}.`,
        imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80"
      }
    ];
  }

  // General spiritual fallback
  return [
    {
      title: "Sacred Manuscripts & Scriptures",
      caption: `Illuminated biblical text and open scriptures representing divine truth in the study of "${sessionName}".`,
      imageUrl: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&w=800&q=80"
    },
    {
      title: "Sanctuary of Study & Meditation",
      caption: `Peaceful environment reserved for spiritual contemplation and scholarly exegesis of ${sessionName}.`,
      imageUrl: "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=800&q=80"
    }
  ];
}

export async function generateLiteraryWorkExport(
  sessionName: string,
  messages: { role: 'user' | 'model'; text: string }[]
): Promise<LiteraryWorkExport> {
  const conversationText = messages
    .slice(-15) // take up to last 15 messages for prompt context
    .map(m => `${m.role === 'user' ? 'Pilgrim' : 'Sanctuary Scholar'}: ${m.text}`)
    .join('\n\n');

  const themeSpecificImages = getThematicImagesForTopic(sessionName, conversationText);

  const fallbackData: LiteraryWorkExport = {
    themeTitle: `Literary Exegesis: ${sessionName || 'Sanctuary Study'}`,
    subtitle: "A Formal Synthesis of Scripture, Lineage, and Scholarly Commentary",
    executiveSummary: `This literary work documents the spiritual and intellectual dialogue conducted within the XeJesUs Sanctuary regarding "${sessionName}". The exchange examines fundamental theological principles, connecting ancient covenant promises to contemporary Christian practice. Through rigorous exegesis, the study illuminates how scripture informs personal faith and community worship.`,
    thematicAnalysis: `The thematic core of this discussion hinges upon divine providence, biblical hermeneutics, and covenantal continuity. By tracing primary scriptures and scholarly consensus, we observe a harmonious thread uniting early patriarchs, prophetic revelations, and apostolic doctrine.`,
    familyTree: [
      {
        generation: "1st Generation",
        person: "Abraham",
        biblicalTitle: "Father of the Faithful",
        significance: "Received the everlasting covenant promise in Genesis 12, establishing the line of faith.",
        keyScripture: "Genesis 12:1-3"
      },
      {
        generation: "2nd Generation",
        person: "Isaac",
        biblicalTitle: "Son of Promise",
        significance: "Carried forward the patriarchal covenant and foreshadowed sacrificial obedience.",
        keyScripture: "Genesis 22:1-14"
      },
      {
        generation: "3rd Generation",
        person: "Jacob (Israel)",
        biblicalTitle: "Patriarch of the Twelve Tribes",
        significance: "Wrestled with God at Peniel and fathered the twelve tribes of Israel.",
        keyScripture: "Genesis 32:28"
      },
      {
        generation: "Royal Lineage",
        person: "King David",
        biblicalTitle: "The Royal Psalmist",
        significance: "Established the messianic kingdom lineage through the Davidic Covenant.",
        keyScripture: "2 Samuel 7:12-16"
      },
      {
        generation: "Messianic Fulfillment",
        person: "Jesus Christ",
        biblicalTitle: "The Messiah & Prince of Peace",
        significance: "Fulfilled the law and prophets, establishing the New Covenant for all believers.",
        keyScripture: "Matthew 1:1"
      }
    ],
    scholarlyWorks: [
      {
        title: "The Antiquities of the Jews",
        author: "Flavius Josephus",
        era: "1st Century AD",
        summary: "A monumental twenty-volume historiographical treatise recording the history of the Jewish people from creation to the Jewish War.",
        relevance: "Provides invaluable socio-political and historical context surrounding the temple period and Jewish messianic expectations."
      },
      {
        title: "De Civitate Dei (The City of God)",
        author: "Saint Augustine of Hippo",
        era: "5th Century Patristic Era",
        summary: "A masterpiece of Christian philosophy contrasting the earthly city with the heavenly City of God.",
        relevance: "Offers profound theological insights into how believers navigate worldly anxieties while anchoring their hope in divine eternity."
      },
      {
        title: "Commentary on the Holy Scriptures",
        author: "John Chrysostom",
        era: "4th Century AD",
        summary: "Renowned homiletic exegesis celebrated for literal and moral applications of Biblical books.",
        relevance: "Illustrates early Church preaching techniques and practical Christian discipleship."
      }
    ],
    youtubeVideos: [
      {
        title: "Understanding Biblical Covenants & Theology",
        channel: "The BibleProject",
        searchQuery: "BibleProject Covenant Theology",
        url: "https://www.youtube.com/results?search_query=BibleProject+Covenant+Theology",
        description: "An animated, in-depth visual breakdown exploring how Biblical covenants unify the Old and New Testaments."
      },
      {
        title: "Historical & Textual Context of the Gospels",
        channel: "Yale Divinity Courses",
        searchQuery: "Yale Divinity School New Testament History",
        url: "https://www.youtube.com/results?search_query=Yale+Divinity+School+New+Testament+History",
        description: "Academic lectures analyzing the manuscript history, cultural background, and literary genres of Biblical texts."
      },
      {
        title: "The Historical World of First-Century Judea",
        channel: "Academic Christian History",
        searchQuery: "First Century Judea History Bible",
        url: "https://www.youtube.com/results?search_query=First+Century+Judea+History+Bible",
        description: "Documentary exploring the archaeological discoveries and socio-cultural environment of Jesus and His disciples."
      }
    ],
    images: themeSpecificImages
  };

  try {
    const res = await fetch("/api/generate-literary-work", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionName, messages }),
    });

    if (res.ok) {
      const rawText = await res.text();
      let parsed: any = null;
      if (rawText && rawText.trim()) {
        try {
          parsed = JSON.parse(rawText);
        } catch {
          // not json
        }
      }
      if (parsed && typeof parsed === 'object') {
        const imagesWithFallback = Array.isArray(parsed.images) && parsed.images.length > 0
          ? parsed.images.map((img: any, idx: number) => {
              const imgContext = `${img.title || ''} ${img.caption || ''} ${sessionName} ${conversationText}`;
              const specificThemeImages = getThematicImagesForTopic(sessionName, imgContext);
              const chosenThemeImg = specificThemeImages[idx % specificThemeImages.length] || themeSpecificImages[idx % themeSpecificImages.length];

              return {
                title: (img.title && img.title.length > 3) ? img.title : chosenThemeImg.title,
                caption: (img.caption && img.caption.length > 10) ? img.caption : chosenThemeImg.caption,
                imageUrl: chosenThemeImg.imageUrl
              };
            })
          : themeSpecificImages;

        return {
          ...fallbackData,
          ...parsed,
          familyTree: Array.isArray(parsed.familyTree) && parsed.familyTree.length > 0 ? parsed.familyTree : fallbackData.familyTree,
          scholarlyWorks: Array.isArray(parsed.scholarlyWorks) && parsed.scholarlyWorks.length > 0 ? parsed.scholarlyWorks : fallbackData.scholarlyWorks,
          youtubeVideos: Array.isArray(parsed.youtubeVideos) && parsed.youtubeVideos.length > 0 ? parsed.youtubeVideos : fallbackData.youtubeVideos,
          images: imagesWithFallback,
        };
      }
    }
  } catch (err) {
    console.warn("Failed to generate literary work from server API, using fallback data:", err);
  }

  return fallbackData;
}


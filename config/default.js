module.exports = {
  "Application" : {
    "title" : "d.d.e.ze.gs",
    "port" : 10081,
    "session" : {
      "secret" : "d.d.e.ze.gs"
    },
    "twitter" : {
      "consumerKey"    : "Ulo9GnRzZdJxNdROUezig",
      "consumerSecret" : "epYDCAA9eip50C31mxhIqaZUbzPqO9jnVarALP2EsKk"
    }
  },
  "accessLog": {
     "filePath": __dirname + "/../log/access.log",
     "flags"   : "w",
     "encoding": "utf8",
     "mode"    : "0664"
  },
  "systemLog":  {
     "filePath": __dirname + "/../log/system.log",
     "flags"   : "w",
     "encoding": "utf8",
     "mode"    : "0664"
  }
};

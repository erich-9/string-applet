module.exports = {
  "2-Cycle": {
    "quiver": {
      "vertices": [
        {
          "id": 1,
          "x": 100,
          "y": 150
        },
        {
          "id": 2,
          "x": 200,
          "y": 150
        }
      ],
      "arrows": [
        {
          "id": "a",
          "source": 1,
          "target": 2
        },
        {
          "id": "b",
          "source": 2,
          "target": 1
        }
      ]
    },
    "relations": "ab ba"
  },

  "A2": {
    "quiver": {
      "vertices": [
        {
          "id": 1,
          "x": 100,
          "y": 150
        },
        {
          "id": 2,
          "x": 200,
          "y": 150
        }
      ],
      "arrows": [
        {
          "id": "a",
          "source": 1,
          "target": 2
        }
      ]
    }
  },

  "Double Loop": {
    "quiver": {
      "vertices": [
        {
          "id": 1,
          "x": 150,
          "y": 150
        }
      ],
      "arrows": [
        {
          "id": "a",
          "source": 1,
          "target": 1
        },
        {
          "id": "b",
          "source": 1,
          "target": 1
        }
      ]
    },
    "relations": "a^2 b^2 ab-ba"
  },

  "Double Triangle": {
    "quiver": {
      "vertices": [
        {
          "id": 1,
          "x": 50,
          "y": 187.5
        },
        {
          "id": 2,
          "x": 250,
          "y": 187.5
        },
        {
          "id": 3,
          "x": 150,
          "y": 112.5
        },
        {
          "id": 4,
          "x": 150,
          "y": 162.5
        }
      ],
      "arrows": [
        {
          "id": "a",
          "source": 1,
          "target": 3
        },
        {
          "id": "b",
          "source": 3,
          "target": 2
        },
        {
          "id": "c",
          "source": 2,
          "target": 1
        },
        {
          "id": "d",
          "source": 1,
          "target": 4
        },
        {
          "id": "e",
          "source": 4,
          "target": 2
        }
      ]
    },
    "relations": "abc bca cab cd ec ab-de"
  },

  "Kronecker": {
    "quiver": {
      "vertices": [
        {
          "id": 1,
          "x": 100,
          "y": 150
        },
        {
          "id": 2,
          "x": 200,
          "y": 150
        }
      ],
      "arrows": [
        {
          "id": "a",
          "source": 1,
          "target": 2
        },
        {
          "id": "b",
          "source": 1,
          "target": 2
        }
      ]
    }
  },

  "Linear A3": {
    "quiver": {
      "vertices": [
        {
          "id": 1,
          "x": 50,
          "y": 150
        },
        {
          "id": 2,
          "x": 150,
          "y": 150
        },
        {
          "id": 3,
          "x": 250,
          "y": 150
        }
      ],
      "arrows": [
        {
          "id": "a",
          "source": 1,
          "target": 2
        },
        {
          "id": "b",
          "source": 2,
          "target": 3
        }
      ]
    }
  },

  "Loop": {
    "quiver": {
      "vertices": [
        {
          "id": 1,
          "x": 150,
          "y": 150
        }
      ],
      "arrows": [
        {
          "id": "a",
          "source": 1,
          "target": 1
        }
      ]
    },
    "relations": "a^4"
  },

  "Triangle": {
    "quiver": {
      "vertices": [
        {
          "id": 1,
          "x": 50,
          "y": 187.5
        },
        {
          "id": 2,
          "x": 250,
          "y": 187.5
        },
        {
          "id": 3,
          "x": 150,
          "y": 112.5
        }
      ],
      "arrows": [
        {
          "id": "a",
          "source": 1,
          "target": 3
        },
        {
          "id": "b",
          "source": 3,
          "target": 2
        },
        {
          "id": "c",
          "source": 2,
          "target": 1
        }
      ]
    },
    "relations": "ab bc ca"
  }
};

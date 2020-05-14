import { LanguageSelector, NavbarUserControl } from "common-ui";
import Link from "next/link";
import React from "react";
import { ObjectStoreMessage } from "../../../intl/objectstore-intl";
import "./nav.css";

export function Nav() {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light fixed-top">
      <div className="container-fluid p-0">
        <Link href="/">
          <a
            className="navbar-brand"
            style={{ color: "#1465b7", fontWeight: "bold" }}
          >
            <ObjectStoreMessage id="appTitle" />
          </a>
        </Link>
        <ul className="navbar-nav ml-auto">
          <li className="nav-item mx-2">
            <LanguageSelector />
          </li>
          <li className="nav-item mx-2">
            <NavbarUserControl />
          </li>
        </ul>
      </div>
    </nav>
  );
}

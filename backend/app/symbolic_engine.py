from z3 import Solver, BoolSort, DeclareSort, Const, Function, ForAll, Implies, sat, unsat, parse_smt2_string
from z3 import *
import logging
import re
from typing import List, Dict


logger = logging.getLogger(__name__)

def build_and_check_symbolic_model(all_findings: List[Dict]):
    """
    Universal symbolic engine for any number of HasPermission rules.
    
    - all_findings: list of dicts from LLM, each containing 'z3_assertion'
    Returns: dict with consistency status and violations.
    """
    solver = Solver()

    # --- 1. Declare universal sorts and functions ---
    Role = DeclareSort('Role')
    Action = DeclareSort('Action')
    Resource = DeclareSort('Resource')
    HasPermission = Function('HasPermission', Role, Action, Resource, BoolSort())

    # Track dynamically created constants for Roles, Actions, Resources
    roles_map, actions_map, resources_map = {}, {}, {}

    # --- 2. Add all assertions dynamically ---
    for finding in all_findings:
        expr_str = finding.get("z3_assertion")
        if not expr_str:
            continue
        try:
            # Convert assertion string into proper Z3 expression
            z3_expr = parse_haspermission_expr(expr_str, roles_map, actions_map, resources_map,
                                               HasPermission, Role, Action, Resource)
            if z3_expr is not None:
                solver.add(z3_expr)
            else:
                logger.warning(f"Skipping unparseable assertion: {expr_str}")
        except Exception as e:
            logger.warning(f"Failed to parse assertion: {expr_str}, Error: {e}")

    # --- 3. Check solver consistency ---
    result = {"consistent": None, "violations": []}
    check = solver.check()
    if check == sat:
        result["consistent"] = True
    elif check == unsat:
        result["consistent"] = False
        result["violations"].append("Internal contradictions detected among inferred rules.")
    else:
        result["consistent"] = False
        result["violations"].append("Solver could not determine consistency.")

    return result


def parse_haspermission_expr(expr_str: str, roles_map: Dict, actions_map: Dict, resources_map: Dict,
                             HasPermission, Role, Action, Resource):
    """
    Converts a single LLM-generated HasPermission assertion string
    into a Z3 expression. Works for any number of rules.

    Supports optional conditions in square brackets but treats them
    conservatively (ignore for now if unsure).

    Example input:
        "(HasPermission member view Project)"
        "(HasPermission admin delete User [if_owner])"
    """
    try:
        # Remove optional conditions (inside square brackets)
        cleaned_expr = expr_str.split('[')[0].strip()

        # Match HasPermission(...) structure using basic parsing
        # Example: (HasPermission role action resource)
        tokens = cleaned_expr.replace('(', '').replace(')', '').split()
        if len(tokens) != 4 or tokens[0] != "HasPermission":
            logger.warning(f"Invalid HasPermission format: {expr_str}")
            return None

        _, role_str, action_str, resource_str = tokens

        # Map or create Z3 constants dynamically
        role_const = roles_map.setdefault(role_str, Const(role_str, Role))
        action_const = actions_map.setdefault(action_str, Const(action_str, Action))
        resource_const = resources_map.setdefault(resource_str, Const(resource_str, Resource))

        return HasPermission(role_const, action_const, resource_const)

    except Exception as e:
        logger.warning(f"Failed to parse Z3 assertion: {expr_str}. Error: {e}")
        return None